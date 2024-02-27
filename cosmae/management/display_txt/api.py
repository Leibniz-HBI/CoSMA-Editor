"API methods for managing display_txt order."

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.management.display_txt.util import (
    DISPLAY_TXT_ORDER_CONFIG_KEY,
    get_display_txt_order_tag_definitions,
)
from cosmae.management.models_django import AlreadyInListException, ConfigValue
from cosmae.tag.api.definitions import TagDefinitionResponse, TagDefinitionResponseList
from cosmae.tag.api.models_conversion import tag_definition_db_to_api
from cosmae.tag.models_django import TagDefinition
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user

router = Router()


class DisplayTxtOrderAppend(Schema):
    "API model for appending a tag definition to the display text order"

    # pylint: disable=too-few-public-methods
    id_tag_definition_persistent: str


@router.get(
    "order",
    response={
        200: TagDefinitionResponseList,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get(request: HttpRequest):
    "API method to get the tag definition order for determining the display txt"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        tag_def_query = get_display_txt_order_tag_definitions()
        return 200, TagDefinitionResponseList(
            tag_definitions=[
                tag_definition_db_to_api(tag_def) for tag_def in tag_def_query
            ]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not get tag definitions for display text order."
        )


@router.post(
    "order/append",
    response={
        200: TagDefinitionResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def append(request: HttpRequest, request_data: DisplayTxtOrderAppend):
    "API method for appending a tag definition to the display text order by its persistent id."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        tag_definition = TagDefinition.most_recent_by_id(
            request_data.id_tag_definition_persistent
        )
        if not tag_definition.curated:
            return 400, ApiError(
                msg="Can only use curated tag definitions in display text order."
            )
        ConfigValue.append_to_list(
            DISPLAY_TXT_ORDER_CONFIG_KEY, request_data.id_tag_definition_persistent
        )
        return 200, tag_definition_db_to_api(tag_definition)
    except AlreadyInListException:
        return 400, ApiError(msg="Can not add tag definition that is already in list.")
    except TagDefinition.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Tag definition does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not append tag definition to display text order."
        )


@router.delete(
    "order/{id_tag_definition_persistent}",
    response={
        200: None,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def remove(request: HttpRequest, id_tag_definition_persistent: str):
    "API method for deleting a tag definition from the display text order by its persistent id."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        ConfigValue.remove_from_list(
            DISPLAY_TXT_ORDER_CONFIG_KEY, id_tag_definition_persistent
        )
        return 200, None
    except TagDefinition.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Tag definition does not exist.")
    except ValueError:
        return 200, None
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(
            msg="Could not remove tag definition from display text order."
        )
