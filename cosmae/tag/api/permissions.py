"API methods for changing tag definition permissions."

from typing import List, Union
from uuid import uuid4

from django.db import transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException, PermissionException
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.api.models_api import TagDefinitionResponse
from cosmae.tag.api.models_conversion import (
    tag_definition_db_dict_to_api,
    tag_definition_db_to_api,
)
from cosmae.tag.models_django import OwnershipRequest as OwnershipRequestDb
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.user.model_conversion.public import user_db_to_public_user_info
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()


class OwnershipRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API model for ownership requests."
    petitioner: PublicUserInfo
    receiver: PublicUserInfo
    tag_definition: TagDefinitionResponse
    id_persistent: str


class OwnerShipRequestList(Schema):
    # pylint: disable=too-few-public-methods
    "API model for response containing ownership requests."
    received: List[OwnershipRequest]
    petitioned: List[OwnershipRequest]


@router.post(
    "/{id_tag_definition_persistent}/curate",
    response={
        200: TagDefinitionResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_curation(request: HttpRequest, id_tag_definition_persistent):
    "API method for setting a tag definition as curated."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        if user.permission_group not in {CosmaeUser.COMMISSIONER, CosmaeUser.EDITOR}:
            return 403, ApiError(msg="Insufficient permissions")
        with transaction.atomic():
            tag_definition = TagDefinitionDb.most_recent_by_id(
                id_tag_definition_persistent
            )
            time_edit = timestamp()
            tag_definition, do_write = tag_definition.set_curated(user, time_edit)
            if do_write:
                tag_definition.save()
            OwnershipRequestDb.by_id_tag_definition_persistent_query_set(
                id_tag_definition_persistent
            ).delete()
            TagMergeRequest.change_owner_for_tag_def(tag_definition.id_persistent, None)
        return 200, tag_definition_db_to_api(tag_definition)
    except TagDefinitionDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Tag Definition does not exist.")
    except PermissionException:
        return 403, ApiError(msg="Insufficient permissions.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not change curation status of tag definition")


@router.post(
    "{id_tag_definition_persistent}/owner/{id_user_persistent}",
    response={
        200: Union[TagDefinitionResponse, None],
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_ownership_request(  # pylint:: disable=too-many-return-statements
    request: HttpRequest, id_tag_definition_persistent: str, id_user_persistent: str
):
    "API method for creating an ownership request."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    tag_definition = TagDefinitionDb.most_recent_by_id(id_tag_definition_persistent)
    if not (
        tag_definition.owner == user
        or (
            tag_definition.owner is None
            and user.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}
        )
    ):
        return 403, ApiError(msg="You do not own the tag definition.")
    if tag_definition.owner is not None and id_user_persistent == str(
        tag_definition.owner.id_persistent
    ):
        return 400, ApiError(msg="You already own that tag.")
    try:
        with transaction.atomic():
            OwnershipRequestDb.by_id_tag_definition_persistent_query_set(
                id_tag_definition_persistent
            ).delete()
            if str(user.id_persistent) == id_user_persistent:
                time_edit = timestamp()
                tag_definition_new, do_save = tag_definition.set_owner(
                    user, user, time_edit
                )
                if do_save:
                    with transaction.atomic():
                        tag_definition_new.save()
                        TagMergeRequest.change_owner_for_tag_def(
                            id_tag_definition_persistent, user
                        )
                return 200, tag_definition_db_to_api(tag_definition_new)
            receiver = CosmaeUser.objects.filter(id_persistent=id_user_persistent).get()
            OwnershipRequestDb.objects.create(  # pylint: disable = no-member
                id_tag_definition_persistent=id_tag_definition_persistent,
                receiver=receiver,
                petitioner=user,
                id_persistent=uuid4(),
            )
        return 200, None
    except CosmaeUser.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="User Does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create ownership request")


@router.post(
    "owner/{id_ownership_request_persistent}/accept",
    response={
        200: TagDefinitionResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def post_accept_ownership_request(
    request: HttpRequest, id_ownership_request_persistent
):
    "API method for accepting an ownership request."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authorized.")
    try:
        ownership_request = OwnershipRequestDb.by_id_persistent(
            id_ownership_request_persistent
        )
        if ownership_request.receiver != user:
            return 403, ApiError(
                msg="You are not the recipient of the ownership request."
            )
        time_edit = timestamp()
        tag_definition = TagDefinitionDb.most_recent_by_id(
            ownership_request.id_tag_definition_persistent
        )
        tag_definition_new, do_save = tag_definition.set_owner(
            user, ownership_request.petitioner, time_edit
        )
        if do_save:
            with transaction.atomic():
                tag_definition_new.save()
                TagMergeRequest.change_owner_for_tag_def(
                    tag_definition_new.id_persistent, ownership_request.receiver
                )
                ownership_request.delete()
        return 200, tag_definition_db_to_api(tag_definition_new)

    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not accept ownership request")


@router.delete(
    "owner/{id_ownership_request_persistent}",
    response={
        200: None,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def delete_ownership_request(request: HttpRequest, id_ownership_request_persistent):
    "API method for deleting an ownership request."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authorized.")
    try:
        ownership_request = OwnershipRequestDb.by_id_persistent(
            id_ownership_request_persistent
        )
        if ownership_request.petitioner != user:
            is_owner = False
            if user.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}:
                tag_definition = TagDefinitionDb.most_recent_by_id(
                    ownership_request.id_tag_definition_persistent
                )
                is_owner = tag_definition.curated
            if not is_owner:
                return 403, ApiError(
                    msg="You are not the petitioner of the ownership request."
                )
        ownership_request.delete()
        return 200, None

    except TagDefinitionDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Tag Definition does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not delete ownership request")


@router.get(
    "ownership_requests",
    response={
        200: OwnerShipRequestList,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_ownership_requests(request: HttpRequest):
    "API method for retrieving ownership requests of a user."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")

    try:
        received_db = OwnershipRequestDb.received_by_user_query_set(user)
        petitioned_db = OwnershipRequestDb.petitioned_by_user_query_set(user)

        return 200, OwnerShipRequestList(
            received=[
                ownership_request_db_to_api(req)
                for req in received_db
                if req.tag_definition is not None
            ],
            petitioned=[
                ownership_request_db_to_api(req)
                for req in petitioned_db
                if req.tag_definition is not None
            ],
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not create ownership request")


def ownership_request_db_to_api(ownership_request: OwnershipRequestDb):
    "Transforms a ownership request from database to API model."
    return OwnershipRequest(
        petitioner=user_db_to_public_user_info(ownership_request.petitioner),
        receiver=user_db_to_public_user_info(ownership_request.receiver),
        tag_definition=tag_definition_db_dict_to_api(ownership_request.tag_definition),
        id_persistent=str(ownership_request.id_persistent),
    )
