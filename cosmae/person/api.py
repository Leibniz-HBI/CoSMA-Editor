"""API for handling natural persons."""

from datetime import datetime
from typing import List, Optional, Union
from uuid import uuid4

from django.db import IntegrityError, transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.comments.api import Comment
from cosmae.entity.models_django import Entity as EntityDb
from cosmae.entity.models_django import EntityReason as EntityReasonDb
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
from cosmae.user.models_conversion import user_db_to_public_user_info
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()


class PersonNatural(Schema):
    # pylint: disable=too-few-public-methods
    """API model for a natural person."""

    display_txt: str | None = None
    version: int | None = None
    """The version of the person that the change is made on.
    If null on POST, a new person is created."""
    id_persistent: str | None = None
    disabled: bool | None = None
    display_txt_details: Union[str, TagDefinitionResponse] | None = None


class ReasonList(Schema):
    # pylint: disable=too-few-public-methods
    """API model for multiple entity reasons"""
    reasons: List[Comment]


class ReasonPostRequest(Schema):
    "API model for posting entity reasons"

    # pylint: disable=too-few-public-methods
    reason_txt: str


class ReasonPostResponse(Schema):
    "API model for entity reason in response"

    # pylint: disable=too-few-public-methods
    reason: Comment


class EntityReasonAddRequest(Schema):
    # pylint: disable=too-few-public-methods
    "Request body for adding a new entity reason"
    text: str


class PersonNaturalWithReason(PersonNatural):
    "API Model for an entity with reason"

    # pylint: disable=too-few-public-methods
    reason_txt: str | None = None


class PersonNaturalList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural persons."""

    persons: List[PersonNatural]


class PersonNaturalWithReasonList(Schema):
    # pylint: disable=too-few-public-methods
    """API Model for multiple natural persons
    with reason for being in the db,
    used for responses"""

    persons: List[PersonNaturalWithReason]


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
        200: PersonNaturalWithReasonList,
        400: ApiError,
        401: ApiError,
        500: ApiError,
        403: ApiError,
    },
)
def persons_post(
    request: HttpRequest, persons: PersonNaturalWithReasonList
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
    now = timestamp()
    try:
        person_dbs = [person_api_to_db(person, now, user) for person in persons.persons]
    except ValidationException as valid_x:
        return 400, ApiError(msg=str(valid_x))
    except DbObjectExistsException as exc:
        return 500, ApiError(
            msg=(
                "Could not generate an id for person "
                f"with display_txt {exc.values['display_txt']}."
            )
        )
    except EntityUpdatedException as updated_x:
        return 400, ApiError(
            msg="There has been a concurrent modification "
            f"to the person with id_persistent {updated_x.new_value.id_persistent}."
        )

    try:
        with transaction.atomic():
            for person, do_write, reason, write_reason in person_dbs:
                person.reason_txt = reason.text
                if do_write:
                    person.save()
                if write_reason:
                    reason.save()
    except IntegrityError:
        return 500, ApiError(msg="Provided data not consistent with database.")
    return 200, PersonNaturalWithReasonList(
        persons=[person_db_to_api(person) for person, _, _, _ in person_dbs]
    )


@router.post(
    "chunk",
    response={
        200: PersonNaturalWithReasonList,
        400: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def persons_chunks_post(
    request: HttpRequest, req_data: ChunkRequest  # pylint: disable=unused-argument
):
    """Get a chunk of persons.
    Note:
        The persons are ordered by the order of initial creation."""
    chunk_limit = 1000
    if req_data.limit > chunk_limit:
        return 400, ApiError(msg=f"Please specify limit smaller than {chunk_limit}.")
    user = check_user(request)
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        person_dbs = EntityReasonDb.annotate_reason(
            EntityDb.get_most_recent_chunked(req_data.offset, req_data.limit)
        )
        person_apis = [person_db_to_api(person) for person in person_dbs]
        return 200, PersonNaturalWithReasonList(persons=person_apis)
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


@router.get(
    "{id_entity_persistent}/reasons",
    response={200: ReasonList, 401: ApiError, 403: ApiError, 500: ApiError},
)
def get_reasons(request: HttpRequest, id_entity_persistent):
    "Get reasons for an entity being in the database"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        reasons = EntityReasonDb.for_id_entity_persistent_asc(id_entity_persistent)
        return 200, ReasonList(reasons=[reason_db_to_api(reason) for reason in reasons])
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get Reasons.")


@router.put(
    "{id_entity_persistent}/reasons",
    response={
        200: ReasonPostResponse,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def put_reason(request: HttpRequest, id_entity_persistent, reason: ReasonPostRequest):
    """Add a reason for an entity being in the db"""
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions")
    try:
        EntityDb.most_recent_by_id(id_entity_persistent)
        time_written = timestamp()
        reason_created = EntityReasonDb.add(
            id_persistent=uuid4(),
            id_entity_persistent=id_entity_persistent,
            text=reason.reason_txt,
            timestamp=time_written,
            author=user,
        )
        return 200, ReasonPostResponse(reason=reason_db_to_api(reason_created))
    except EntityDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Entity does not exist")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get Reasons.")


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
        if person.reason_txt is None:
            raise ValidationException(
                f"No reason given for entity with display_txt {person.display_txt}"
            )
        persistent_id = str(uuid4())
    entity_db, save_entity = EntityDb.change_or_create_versioned(
        display_txt=person.display_txt,
        time_edit=time_edit,
        id_persistent=persistent_id,
        written_by_id_persistent=requester.id_persistent,
        version=person.version,
        disabled=person.disabled or False,
    )
    if person.reason_txt is None:
        try:
            reason = EntityReasonDb.for_id_entity_persistent_desc(persistent_id)[
                :1
            ].get()
        except EntityReasonDb.DoesNotExist:  # pylint: disable=no-member
            reason = None
        save_reason = False
    else:
        reason = EntityReasonDb(
            id_persistent=uuid4(),
            id_entity_persistent=persistent_id,
            text=person.reason_txt,
            timestamp=time_edit,
            author=requester,
        )
        save_reason = True
    return entity_db, save_entity, reason, save_reason


def person_db_to_api(person: EntityDb) -> PersonNatural:
    """Transform a natural person from DB to API representation."""
    display_txt = person.display_txt
    id_persistent = person.id_persistent
    display_txt, display_txt_info = get_display_txt_info(id_persistent, display_txt)
    if isinstance(display_txt_info, dict):
        display_txt_info = tag_definition_db_dict_to_api(display_txt_info)
    return PersonNaturalWithReason(
        display_txt=display_txt,
        version=person.id,
        id_persistent=id_persistent,
        disabled=person.disabled,
        display_txt_details=display_txt_info,
        reason_txt=person.reason_txt,
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


def reason_db_to_api(reason: EntityReasonDb) -> Comment:
    "Transform a reason from database to APi representation"
    return Comment(
        content=reason.text,
        author=user_db_to_public_user_info(reason.author),
        timestamp=reason.timestamp,
    )
