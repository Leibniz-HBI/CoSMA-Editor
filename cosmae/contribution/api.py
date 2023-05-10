"API methods for handling contributions."
import os
from typing import List, Optional
from uuid import uuid4

from django.conf import settings
from django.db import DatabaseError
from ninja import File, Form, Router, Schema, UploadedFile

from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user


class ContributionPostRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request data for adding a new contribution"
    name: str
    description: str
    anonymous: bool
    has_header: bool


class ContributionPostResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response data for successful creation of a contribution"
    id_persistent: str


class ContributionChunkRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for requesting contribution candidates in chunks"
    offset: int
    limit: int


class ContributionCandidate(Schema):
    # pylint: disable=too-few-public-methods
    "API model for contribution candidates"
    id_persistent: str
    name: str
    description: str
    anonymous: bool
    has_header: bool
    state: str
    author: Optional[str]


class ContributionCandidatePatchRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for contribution candidate patch requests"
    name: Optional[str]
    description: Optional[str]
    anonymous: Optional[bool]
    has_header: Optional[bool]


class ContributionChunkResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response containing multiple contribution candidates."
    contributions: List[ContributionCandidate]


router = Router()

ALLOWED_CONTENT_TYPES = ["text/csv"]


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
        if content_type == "text/csv":
            extension = ".csv"
        else:
            return 400, ApiError(
                msg=f"Invalid content type. Only {','.join(ALLOWED_CONTENT_TYPES)} allowed."
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
            contribution_db = ContributionCandidateDb.by_id_persistent(
                id_persistent, check_user(request)
            )
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
    response={200: ContributionCandidate, 401: ApiError, 500: ApiError, 404: ApiError},
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

    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not patch contribution")


def mk_initial_contribution_candidate(
    contribution_api: ContributionPostRequest, user: CosmaeUser
):
    """Transform an API Contribution post to an initial database contribution candidate.
    The result has no file name assigned."""
    uuid = str(uuid4())
    return ContributionCandidateDb(
        name=contribution_api.name,
        description=contribution_api.description,
        anonymous=contribution_api.anonymous,
        id_persistent=uuid,
        has_header=contribution_api.has_header,
        created_by=user,
        state=ContributionCandidateDb.UPLOADED,
    )


def contribution_db_to_api(
    contribution_db: ContributionCandidateDb,
) -> ContributionCandidate:
    "Transform a contribution candidate from DB to API representation."
    if contribution_db.anonymous:
        author = None
    else:
        author = contribution_db.created_by.username
    return ContributionCandidate(
        id_persistent=str(contribution_db.id_persistent),
        name=contribution_db.name,
        description=contribution_db.description,
        anonymous=contribution_db.anonymous,
        has_header=contribution_db.has_header,
        state=_contribution_state_mapping_db_to_api[contribution_db.state],
        author=author,
    )


_contribution_state_mapping_db_to_api = {
    ContributionCandidateDb.UPLOADED: "UPLOADED",
    ContributionCandidateDb.COLUMNS_EXTRACTED: "COLUMNS_EXTRACTED",
    ContributionCandidateDb.COLUMNS_ASSIGNED: "COLUMNS_ASSIGNED",
    ContributionCandidateDb.ENTITIES_MATCHED: "ENTITIES_MATCHED",
    ContributionCandidateDb.ENTITIES_ASSIGNED: "ENTITIES_ASSIGNED",
    ContributionCandidateDb.VALUES_ASSIGNED: "VALUES_ASSIGNED",
    ContributionCandidateDb.MERGED: "MERGED",
}
