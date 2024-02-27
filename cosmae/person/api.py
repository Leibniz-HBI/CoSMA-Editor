"""API for handling natural persons."""

from datetime import datetime
from typing import List, Optional, Union
from uuid import uuid4

from django.db import IntegrityError
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.entity.models_django import Entity as EntityDb
from cosmae.entity.queue import get_display_txt_info
from cosmae.exception import (
    ApiError,
    DbObjectExistsException,
    EntityUpdatedException,
    NotAuthenticatedException,
    ValidationException,
)
from cosmae.tag.api.definitions import TagDefinitionResponse
from cosmae.tag.api.models_conversion import tag_definition_db_dict_to_api
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user
from cosmae.util.django import save_many_atomic

router = Router()


class PersonNatural(Schema):
    # pylint: disable=too-few-public-methods
    """API model for a natural person."""

    display_txt: Optional[str]
    version: Optional[int]
    """The version of the person that the change is made on.
    If null on POST, a new person is created."""
    id_persistent: Optional[str]
    disabled: Optional[bool]
    display_txt_details: Optional[Union[str, TagDefinitionResponse]]


class PersonNaturalList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural persons."""

    persons: List[PersonNatural]


class PersonsGetRequest(Schema):
    # pylint: disable=too-few-public-methods
    """Model for return type of posting persons."""

    modified_ids: List[str]


class PersonCountResponse(Schema):
    # pylint: disable=too-few-public-methods
    """Response for the count person request."""

    count: int


class ChunkRequest(Schema):
    # pylint: disable=too-few-public-methods
    """Request body for chunks of persons"""

    offset: int
    limit: int


@router.post(
    "",
    response={
        200: PersonNaturalList,
        400: ApiError,
        401: ApiError,
        500: ApiError,
        403: ApiError,
    },
)
def persons_post(
    request: HttpRequest, persons: PersonNaturalList
):  # pylint: disable=too-many-return-statements
    """Add a person to the DB.
    Returns:
        PersonNaturalList: The updated persons.
    """
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group in {CosmaeUser.APPLICANT, CosmaeUser.READER}:
        return 403, ApiError(msg="Insufficient Permissions")
    now = datetime.utcnow()
    try:
        person_dbs = [person_api_to_db(person, now, user) for person in persons.persons]
    except ValidationException as valid_x:
        return 400, ApiError(msg=str(valid_x))
    except DbObjectExistsException as exists_x:
        return 500, ApiError(
            msg=(
                "Could not generate an id for person "
                f"with display_txt {exists_x.display_txt}."
            )
        )
    except EntityUpdatedException as updated_x:
        return 400, ApiError(
            msg="There has been a concurrent modification "
            f"to the person with id_persistent {updated_x.new_value.id_persistent}."
        )

    try:
        save_many_atomic(person for person, do_write in person_dbs if do_write)
    except IntegrityError:
        return 500, ApiError(msg="Provided data not consistent with database.")
    return 200, PersonNaturalList(
        persons=[person_db_to_api(person) for person, _ in person_dbs]
    )


@router.post(
    "chunk",
    response={200: PersonNaturalList, 400: ApiError, 500: ApiError},
)
def persons_chunks_post(_, req_data: ChunkRequest):
    """Get a chunk of persons.
    Note:
        The persons are ordered by the order of initial creation."""
    chunk_limit = 1000
    if req_data.limit > chunk_limit:
        return 400, ApiError(msg=f"Please specify limit smaller than {chunk_limit}.")
    try:
        person_dbs = EntityDb.get_most_recent_chunked(req_data.offset, req_data.limit)
        person_apis = [person_db_to_api(person) for person in person_dbs]
        return 200, PersonNaturalList(persons=person_apis)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested chunk.")


@router.post(
    "{id_entity_source_persistent}/merge/{id_entity_destination_persistent}",
    response={400: ApiError, 401: ApiError, 403: ApiError, 500: ApiError},
)
def merge_entities(
    request: HttpRequest,
    id_entity_source_persistent: str,
    id_entity_destination_persistent: str,
):
    "Initializes merging of two entities."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group not in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]:
        return 403, ApiError(msg="Insufficient permissions.")
    entity_source = EntityDb.most_recent_by_id(id_entity_source_persistent)
    if entity_source.disabled:
        return 400, ApiError(msg="Source entity is disabled.")
    entity_destination = EntityDb.most_recent_by_id(id_entity_destination_persistent)
    if entity_destination.disabled:
        return 400, ApiError(msg="Destination entity is disabled.")
    return 400, ApiError


def person_api_to_db(
    person: PersonNatural, time_edit: datetime, requester: CosmaeUser
) -> EntityDb:
    """Transform an natural person from API to DB model."""
    if person.id_persistent:
        persistent_id = person.id_persistent
        if person.version is None:
            raise ValidationException(
                f"person with persistent_id {person.id_persistent} "
                "has no previous version."
            )
    else:
        if person.version:
            raise ValidationException(
                f"Person with display_txt {person.display_txt} "
                "has version but no persistent_id."
            )
        persistent_id = str(uuid4())
    return EntityDb.change_or_create(
        display_txt=person.display_txt,
        time_edit=time_edit,
        id_persistent=persistent_id,
        requester=requester,
        version=person.version,
        disabled=person.disabled or False,
    )


def person_db_to_api(person: EntityDb) -> PersonNatural:
    """Transform a natural person from DB to API representation."""
    display_txt = person.display_txt
    id_persistent = person.id_persistent
    display_txt, display_txt_info = get_display_txt_info(id_persistent, display_txt)
    if isinstance(display_txt_info, dict):
        display_txt_info = tag_definition_db_dict_to_api(display_txt_info)
    return PersonNatural(
        display_txt=display_txt,
        version=person.id,
        id_persistent=id_persistent,
        disabled=person.disabled,
        display_txt_details=display_txt_info,
    )


def person_db_dict_to_api(person: Optional[dict]) -> Optional[PersonNatural]:
    "Transform a person natural db dict to an API representation"
    if person is None:
        return None
    id_persistent = person["id_persistent"]
    display_txt = person["display_txt"]
    display_txt, display_txt_info = get_display_txt_info(id_persistent, display_txt)
    if isinstance(display_txt_info, dict):
        display_txt_info = tag_definition_db_dict_to_api(display_txt_info)
    return PersonNatural(
        display_txt=display_txt,
        version=person["id"],
        id_persistent=id_persistent,
        disabled=person["disabled"],
        display_txt_details=display_txt_info,
    )
