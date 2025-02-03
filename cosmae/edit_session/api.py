"API models for edit sessions"

from typing import List
from uuid import uuid4

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.edit_session.models_django import EditSession as EditSessionDb
from cosmae.edit_session.models_django import (
    EditSessionParticipant as EditSessionParticipantDb,
)
from cosmae.edit_session.orcid import OrcidService, validate_orcid
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user

router = Router()


class EditSessionParticipant(Schema):
    # pylint: disable=too-few-public-methods
    "API model for edit session participants"
    type_participant: str
    id_participant: str


class EditSessionParticipantWithName(EditSessionParticipant):
    # pylint: disable=too-few-public-methods
    "Edit session participant with name."
    name_participant: str


class EditSession(Schema):
    # pylint: disable=too-few-public-methods
    "API model for edit sessions."
    id_persistent: str
    owner: EditSessionParticipant
    participant_list: List[EditSessionParticipantWithName]
    name: str


class EditSessionList(Schema):
    # pylint: disable=too-few-public-methods
    "API model for multiple edit sessions."
    edit_session_list: List[EditSession]


class EditSessionPatch(Schema):
    "API model for changing edit sessions."

    # pylint: disable=too-few-public-methods
    name: str | None = None


class EditSessionPut(Schema):
    "API model  for creating edit sessions"

    # pylint: disable=too-few-public-methods
    name: str | None = None


class ParticipantSearchPost(Schema):
    "API model for searching participants"

    search_term: str


class ParticipantSearchResponse(Schema):
    "API model for participant search results"

    search_result_list: List[EditSessionParticipantWithName]


@router.post(
    "search",
    response={
        200: ParticipantSearchResponse,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def search_participants(request: HttpRequest, request_data: ParticipantSearchPost):
    "API method for searching for edit session participants"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group == CosmaeUser.APPLICANT:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        search_term = request_data.search_term
        validated_orcid = validate_orcid(search_term)
        if validated_orcid is not None:
            name = OrcidService.get_name(validated_orcid)
            if name is not None:
                return 200, ParticipantSearchResponse(
                    search_result_list=[
                        EditSessionParticipantWithName(
                            type_participant="ORCID",
                            id_participant=validated_orcid,
                            name_participant=name,
                        )
                    ]
                )

        users = CosmaeUser.search_username(search_term)
        return 200, ParticipantSearchResponse(
            search_result_list=[
                EditSessionParticipantWithName(
                    type_participant="INTERNAL",
                    id_participant=user_db.id_persistent,
                    name_participant=user_db.username,
                )
                for user_db in users
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get possible contributors.")


@router.get(
    "owner",
    response={200: EditSessionList, 401: ApiError, 403: ApiError, 500: ApiError},
)
def get_edit_sessions_owner(request: HttpRequest):
    "API method for retrieving all edit sessions a user owns."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        if user.permission_group in {CosmaeUser.APPLICANT, CosmaeUser.READER}:
            return 403, ApiError(msg="Insufficient permissions")
        sessions_db = EditSessionDb.owned_by_user(user)
        return 200, EditSessionList(
            edit_session_list=[
                edit_session_db_to_api(session) for session in sessions_db
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get edit sessions.")


@router.get(
    "participant",
    response={200: EditSessionList, 401: ApiError, 403: ApiError, 500: ApiError},
)
def get_edit_sessions_participant(request: HttpRequest):
    "API method for retrieving all edit sessions a user participates in."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        if user.permission_group in {CosmaeUser.APPLICANT, CosmaeUser.READER}:
            return 403, ApiError(msg="Insufficient permissions")
        sessions_db = EditSessionDb.user_participates(user)
        return 200, EditSessionList(
            edit_session_list=[
                edit_session_db_to_api(session) for session in sessions_db
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get edit sessions.")


@router.put(
    "",
    response={
        200: EditSession,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def put_edit_session(request: HttpRequest, body: EditSessionPut):
    "API method for creating a new edit session"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group in {CosmaeUser.APPLICANT, CosmaeUser.READER}:
        return 403, ApiError(msg="Insufficient permissions")
    name = body.name
    if name is None:
        name = (
            "Edit Session "
            f"{len(EditSessionDb.objects.filter(id_owner_persistent=user.id_persistent))}"
        )
    try:
        id_session = str(uuid4())
        session_db = EditSessionDb.create(
            id_persistent=id_session,
            name=name,
            user=user,
        )
        user.set_current_edit_session(session_db)
        return 200, edit_session_db_to_api(session_db)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create edit session")


def check_session(request, id_edit_session_persistent, allow_participant=False):
    "Check whether the user of a request owns a session."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return None, (401, ApiError(msg="Not authenticated"))
    if user.permission_group == CosmaeUser.APPLICANT:
        return None, (403, ApiError(msg="Insufficient permissions"))
    try:
        session = EditSessionDb.objects.filter(
            id_persistent=id_edit_session_persistent
        ).get()
        if session.id_owner_persistent != user.id_persistent:
            if (
                allow_participant
                and len(
                    EditSessionParticipantDb.objects.filter(
                        edit_session_id=id_edit_session_persistent,
                        id_participant=user.id_persistent,
                        type_participant=EditSessionParticipantDb.INTERNAL,
                    )
                )
                > 0
            ):
                return session, None
            return None, (
                403,
                ApiError(msg="You are not the owner of this edit session."),
            )
        return session, None
    except EditSessionDb.DoesNotExist:
        return None, (404, ApiError(msg="Edit session not found"))


@router.patch(
    "{id_edit_session_persistent}",
    response={
        200: EditSession,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def patch_edit_session(
    request: HttpRequest, id_edit_session_persistent: str, patch_info: EditSessionPatch
):
    "API method for changing an edit session."
    try:
        session, err = check_session(request, id_edit_session_persistent)
        if err is not None:
            return err
        if patch_info.name is not None:
            session.name = patch_info.name
        session.save()
        return 200, edit_session_db_to_api(session)
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not change edit session")


@router.put(
    "{id_edit_session_persistent}/participants",
    response={
        200: EditSessionParticipantWithName,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def put_participant(
    request: HttpRequest,
    id_edit_session_persistent: str,
    put_body: EditSessionParticipantWithName,
):
    "API method for adding a participant to an edit session."
    try:
        session, err = check_session(request, id_edit_session_persistent)
        if err is not None:
            return err
        type_participant = PARTICIPANT_TYPE_API_TO_DB_DICT[put_body.type_participant]
        participant = EditSessionParticipantDb.add(
            type_participant=type_participant,
            id_participant=put_body.id_participant,
            name_participant=put_body.name_participant,
            id_session_persistent=session.id_persistent,
        )
        return 200, edit_session_participant_db_to_api(participant)
    except KeyError:
        return 400, ApiError(msg="Participant type not known.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not add contributor")


@router.delete(
    "{id_edit_session_persistent}/participants",
    response={200: None, 400: ApiError, 401: ApiError, 403: ApiError, 500: ApiError},
)
def delete_participant(
    request: HttpRequest,
    id_edit_session_persistent: str,
    delete_body: EditSessionParticipant,
):
    "API method for adding a participant to an edit session."
    try:
        session, err = check_session(
            request, id_edit_session_persistent, allow_participant=True
        )
        if err is not None:
            return err
        type_participant = PARTICIPANT_TYPE_API_TO_DB_DICT[delete_body.type_participant]
        if (
            type_participant == EditSessionParticipantDb.INTERNAL
            and session.id_owner_persistent == delete_body.id_participant
        ):
            return 400, ApiError(
                msg="You can not remove yourself from a session you own."
            )
        EditSessionParticipantDb.objects.filter(
            type_participant=type_participant,
            id_participant=delete_body.id_participant,
            edit_session=session,
        ).delete()
        return 200, None
    except KeyError:
        return 400, ApiError(msg="Participant type not known.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not add contributor")


PARTICIPANT_TYPE_DB_TO_API_DICT = {
    EditSessionParticipantDb.INTERNAL: "INTERNAL",
    EditSessionParticipantDb.ORCID: "ORCID",
}

PARTICIPANT_TYPE_API_TO_DB_DICT = {
    "INTERNAL": EditSessionParticipantDb.INTERNAL,
    "ORCID": EditSessionParticipantDb.ORCID,
}


def edit_session_participant_db_to_api(participant: EditSessionParticipantDb):
    "Transform and edit session participant from DB to API model"
    return EditSessionParticipantWithName(
        id_participant=participant.id_participant,
        type_participant=PARTICIPANT_TYPE_DB_TO_API_DICT[participant.type_participant],
        name_participant=participant.name_participant,
    )


def edit_session_db_to_api(edit_session: EditSessionDb):
    "Convert an edit session from db to API format."
    return EditSession(
        name=edit_session.name,
        id_persistent=edit_session.id_persistent,
        owner=EditSessionParticipant(
            id_participant=edit_session.id_owner_persistent,
            type_participant="INTERNAL",
        ),
        participant_list=[
            edit_session_participant_db_to_api(participant)
            for participant in edit_session.editsessionparticipant_set.all()
        ],
    )
