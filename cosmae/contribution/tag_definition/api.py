"API endpoints for managing tags of new contributions."
from typing import List, Optional

from django.db import DatabaseError
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.contribution.models_api import ContributionCandidate
from cosmae.contribution.models_conversion import contribution_db_to_api
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution as TagDefContributionDb,
)
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.util.auth import check_user

router = Router()


class TagDefinitionContribution(Schema):
    "Response Schema for contribution tag definitions."
    # pylint: disable=too-few-public-methods
    name: str
    id_persistent: str
    id_existing_persistent: Optional[str]
    id_parent_persistent: Optional[str]
    type: Optional[str]
    index_in_file: int
    discard: bool


class TagDefinitionContributionResponseList(Schema):
    "Response schema for multiple contribution tag definitions"
    # pylint: disable=too-few-public-methods
    tag_definitions: List[TagDefinitionContribution]
    contribution_candidate: ContributionCandidate


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
        id_persistent = request.resolver_match.captured_kwargs["id_persistent"]
        try:
            candidate = ContributionCandidateDb.by_id_persistent(
                id_persistent, user
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
            contribution_candidate=contribution_db_to_api(candidate),
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError:
        return 500, ApiError(msg="Could not get the tag definitions from the database.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get the requested tag_definitions.")


def tag_definitions_contribution_db_to_api(tag_def_db: TagDefinitionContribution):
    "Convert a contribution tag definition from API to database representation."
    return TagDefinitionContribution(
        name=tag_def_db.name,
        id_persistent=str(tag_def_db.id_persistent),
        id_existing_persistent=tag_def_db.id_existing_persistent,
        id_parent_persistent=tag_def_db.id_parent_persistent,
        type=_tag_type_mapping_db_to_api.get(tag_def_db.type),
        index_in_file=tag_def_db.index_in_file,
        discard=tag_def_db.discard,
    )


_tag_type_mapping_db_to_api = {
    TagDefContributionDb.INNER: "INNER",
    TagDefContributionDb.FLOAT: "FLOAT",
    TagDefContributionDb.STRING: "STRING",
}
