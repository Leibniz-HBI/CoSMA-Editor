"API models for contributions."
from typing import List

from ninja import Schema

from cosmae.tag.api.definitions import TagDefinitionResponse


class ContributionPostRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request data for adding a new contribution"
    name: str
    description: str
    has_header: bool
    empty_values: str | None = "null,nan,na"


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
    has_header: bool
    state: str
    author: str
    error_msg: str | None = None
    error_details: str | None = None
    empty_values: str
    match_tag_definition_list: List[TagDefinitionResponse] | None = None


class ContributionCandidatePatchRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for contribution candidate patch requests"
    name: str | None = None
    description: str | None = None
    has_header: bool | None = None
    empty_values: str | None = None


class ContributionChunkResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Response containing multiple contribution candidates."
    contributions: List[ContributionCandidate]
