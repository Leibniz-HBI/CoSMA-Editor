"API endpoints for managing tags of new contributions."
from typing import List, Optional

from django.db import DatabaseError
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution as TagDefContributionDb,
)
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.tag.models_django import TagDefinition
from cosmae.util.auth import check_user
from cosmae.util.django import patch_from_dict

router = Router()


class TagDefinitionContribution(Schema):
    "Response Schema for contribution tag definitions."
    # pylint: disable=too-few-public-methods
    name: str
    id_persistent: str
    id_existing_persistent: Optional[str]
    index_in_file: int
    discard: bool


class TagDefinitionContributionResponseList(Schema):
    "Response schema for multiple contribution tag definitions"
    # pylint: disable=too-few-public-methods
    tag_definitions: List[TagDefinitionContribution]


class TagDefinitionPatchRequest(Schema):
    "Request for updating a contribution tag definition"
    # pylint: disable=too-few-public-methods
    id_existing_persistent: Optional[str]
    discard: Optional[bool]


@router.get(
    "",
    response={
        200: TagDefinitionContributionResponseList,
        404: ApiError,
        401: ApiError,
        500: ApiError,
        400: ApiError,
    },
)
def get_tag_definitions(request: HttpRequest):
    "API method for getting tag definitions of a contribution candidate."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
        id_contribution_persistent = request.resolver_match.captured_kwargs[
            "id_contribution_persistent"
        ]
        try:
            candidate = ContributionCandidateDb.by_id_persistent(
                id_contribution_persistent, user
            ).get()
        except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Contribution candidate does not exist.")
        if candidate.state == ContributionCandidateDb.UPLOADED:
            return 400, ApiError(msg="Column definitions not yet extracted.")
        tag_definitions_db = TagDefContributionDb.get_by_candidate(candidate)
        if not tag_definitions_db:
            return 404, ApiError(msg="No tag definitions match the given parameters.")
        return 200, TagDefinitionContributionResponseList(
            tag_definitions=[
                tag_definitions_contribution_db_to_api(tag_def)
                for tag_def in tag_definitions_db
            ],
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError:
        return 500, ApiError(msg="Could not get the tag definitions from the database.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get the requested tag_definitions.")


allowed_additional_fields = {"display_txt", "id_persistent"}


@router.patch(
    "{id_persistent}",
    response={
        200: TagDefinitionContribution,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def patch_tag_definition(
    request: HttpRequest, id_persistent: str, patch_data: TagDefinitionPatchRequest
):
    "API method for updating a tag definition of a contribution."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
        id_contribution_persistent = request.resolver_match.captured_kwargs[
            "id_contribution_persistent"
        ]
        try:
            contribution = ContributionCandidateDb.by_id_persistent(
                id_contribution_persistent, user
            ).get()
            if contribution.state != ContributionCandidateDb.COLUMNS_EXTRACTED:
                return 400, ApiError(
                    msg="You can only change column assignments,"
                    ' when the contribution state is "COLUMNS_EXTRACTED".'
                )
            candidate_definition = TagDefContributionDb.get_by_id_persistent(
                id_persistent, contribution
            )
            patch_dict = patch_data.dict(exclude_unset=True)
            id_existing_persistent = patch_dict.get("id_existing_persistent")
            if (
                id_existing_persistent is not None
                and id_existing_persistent not in allowed_additional_fields
            ):
                TagDefinition.most_recent_by_id(id_existing_persistent)
            patch_from_dict(candidate_definition, **patch_dict)
            print(candidate_definition.__dict__)
            return 200, tag_definitions_contribution_db_to_api(candidate_definition)
        except TagDefinition.DoesNotExist:  # pylint: disable=no-member
            return 400, ApiError(msg="Existing tag definition does not exist.")
        except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Contribution candidate does not exist.")
        except TagDefContributionDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Tag definition does not exist.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError:
        return 500, ApiError(
            msg="Could not update the tag definition from the database."
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not update the requested tag_definition.")


def tag_definitions_contribution_db_to_api(tag_def_db: TagDefinitionContribution):
    "Convert a contribution tag definition from API to database representation."
    return TagDefinitionContribution(
        name=tag_def_db.name,
        id_persistent=str(tag_def_db.id_persistent),
        id_existing_persistent=tag_def_db.id_existing_persistent,
        index_in_file=tag_def_db.index_in_file,
        discard=tag_def_db.discard,
    )
