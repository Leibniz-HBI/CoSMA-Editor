"API methods for handling contributions."
import os
from uuid import uuid4

from django.conf import settings
from django.db import DatabaseError
from django.http import HttpRequest
from ninja import File, Form, Router, UploadedFile

from cosmae.contribution.entity.api import router as entity_router
from cosmae.contribution.models_api import (
    ContributionCandidate,
    ContributionCandidatePatchRequest,
    ContributionChunkResponse,
    ContributionPostRequest,
    ContributionPostResponse,
)
from cosmae.contribution.models_conversion import contribution_db_to_api
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)
from cosmae.contribution.tag_definition.api import router as tag_router
from cosmae.exception import ApiError, NotAuthenticatedException, ResourceLockedException
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user, cosmae_auth

router = Router()
router.add_router("/{id_contribution_persistent}/tags", tag_router, auth=cosmae_auth)
router.add_router(
    "/{id_contribution_persistent}/entities", entity_router, auth=cosmae_auth
)

ALLOWED_CONTENT_TYPES = [
    "text/csv",
    "text/plain",
    "text/x-csv",
    "application/vnd.ms-excel",
    "application/csv",
    "application/x-csv",
    "text/csv",
    "text/comma-separated-values",
    "text/x-comma-separated-values",
    "text/tab-separated-values",
]


@router.post(
    "",
    response={200: ContributionPostResponse, 400: ApiError, 500: ApiError},
)
def contribution_post(
    request,
    contribution: ContributionPostRequest = Form(...),
    file: UploadedFile = File(...),
):
    "Create a new contribution"
    try:
        content_type = file.content_type
        if content_type in ALLOWED_CONTENT_TYPES:
            extension = ".csv"
        else:
            return 400, ApiError(
                msg=f"Invalid content type. Only {', '.join(ALLOWED_CONTENT_TYPES)} allowed."
            )
        contribution_db = mk_initial_contribution_candidate(contribution, request.user)
        out_file_name = contribution_db.id_persistent + extension
        out_file_path = os.path.join(settings.CONTRIBUTION_DIRECTORY, out_file_name)
        contribution_db.file_name = out_file_name
        try:
            with open(out_file_path, "wb") as out_f:
                out_f.write(file.read())
        except IOError:
            return 500, ApiError(msg="Could not save the uploaded file.")
        try:
            contribution_db.save()
        except DatabaseError:
            if os.path.exists(out_file_path):
                os.remove(out_file_path)
            return 500, ApiError(
                msg="Could not store the contribution in the database."
            )

        return 200, ContributionPostResponse(
            id_persistent=contribution_db.id_persistent
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create contribution")


@router.get(
    "chunk/{start}/{offset}",
    response={200: ContributionChunkResponse, 401: ApiError, 500: ApiError},
)
def contribution_chunk_get(request, start: int, offset: int):
    "Get the contributions for a user."
    try:
        try:
            user = check_user(request)
        except NotAuthenticatedException:
            return 401, ApiError(msg="Not authenticated.")
        contributions_db = ContributionCandidateDb.chunk_for_user(user, start, offset)
        contributions_api = [
            contribution_db_to_api(contribution) for contribution in contributions_db
        ]
        return 200, ContributionChunkResponse(contributions=contributions_api)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.get(
    "{id_persistent}",
    response={200: ContributionCandidate, 401: ApiError, 500: ApiError, 404: ApiError},
)
def contribution_get(request, id_persistent: str):
    "Get  details on a single contribution candidate"
    try:
        try:
            check_user(request)
            contribution_db = TagMergeRequest.contribution_with_match_tag_definitions(
                id_persistent
            ).get()
        except NotAuthenticatedException:
            return 401, ApiError(msg="Not authenticated.")
        except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Contribution does not exist.")

        contribution_api = contribution_db_to_api(contribution_db)
        return 200, contribution_api
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get contribution")


@router.patch(
    "{id_persistent}",
    response={
        200: ContributionCandidate,
        401: ApiError,
        500: ApiError,
        404: ApiError,
        423: ApiError,
    },
)
def contribution_patch(
    request, id_persistent: str, patch_data: ContributionCandidatePatchRequest
):
    "Update metadata of a contribution"
    try:
        user = check_user(request)
        contribution_db = ContributionCandidateDb.update(
            id_persistent, user, **patch_data.dict(exclude_unset=True)
        )
        return 200, contribution_db_to_api(contribution_db)

    except ResourceLockedException:
        return 423, ApiError(msg="Contribution candidate is currently locked.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not patch contribution")


@router.post(
    "{id_persistent}/column_assignment_complete",
    response={200: None, 400: ApiError, 401: ApiError, 404: ApiError, 500: ApiError},
)
def post_complete_assignment(request: HttpRequest, id_persistent: str):
    "Method for completing the column assignment"
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
        try:
            contribution = ContributionCandidateDb.by_id_persistent(
                id_persistent, user
            ).get()
        except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Contribution candidate does not exist.")
        try:
            if contribution.state != ContributionCandidateDb.COLUMNS_EXTRACTED:
                return 400, ApiError(
                    msg="Can only complete column assignment when "
                    "contribution is in columns extracted state."
                )
            contribution.complete_tag_assignment()
            return 200, None
        except ContributionCandidateDb.MissingRequiredAssignmentsException as exc:
            return 400, ApiError(
                msg="At least one tag has to be assigned to one of the following values: "
                f"{' '.join(exc.required_fields)}."
            )
        except ContributionCandidateDb.InvalidTagAssignmentException as exc:
            return 400, ApiError(
                msg="The following tags are neither discarded nor assigned to existing: "
                f"{', '.join(exc.invalid_column_names_list)}."
            )
        except ContributionCandidateDb.DuplicateAssignmentException as exc:
            return 400, ApiError(
                msg="Assignment to existing tags has to be unique. "
                "Please check the following tags: "
                f"{', '.join(exc.duplicate_assignments_list)}."
            )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError as exc:
        return 500, ApiError(
            msg="Could not complete the column assignment due to a database error."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not complete the column assignment.")


@router.post(
    "{id_persistent}/entity_assignment_complete",
    response={200: None, 400: ApiError, 401: ApiError, 404: ApiError, 500: ApiError},
)
def post_complete_entity_assignment(request: HttpRequest, id_persistent: str):
    "API method to mark an entity assignment as complete."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")

    try:
        contribution_candidate = (
            ContributionCandidateDb.objects.get(  # pylint: disable=no-member
                id_persistent=id_persistent, created_by=user
            )
        )
        if contribution_candidate.state != ContributionCandidateDb.VALUES_EXTRACTED:
            return 400, ApiError(
                msg="Can only complete entities assignment when "
                "contribution is in values extracted state."
            )
        contribution_candidate.complete_entity_assignment()
        return 200, None
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not complete entity assignment for the contribution."
        )


def mk_initial_contribution_candidate(
    contribution_api: ContributionPostRequest, user: CosmaeUser
):
    """Transform an API Contribution post to an initial database contribution candidate.
    The result has no file name assigned."""
    uuid = str(uuid4())
    return ContributionCandidateDb(
        name=contribution_api.name,
        description=contribution_api.description,
        id_persistent=uuid,
        has_header=contribution_api.has_header,
        created_by=user,
        state=ContributionCandidateDb.UPLOADED,
    )
