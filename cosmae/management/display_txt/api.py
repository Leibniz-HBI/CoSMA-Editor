"API methods for managing display_txt order."

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.column.api import ColumnResponseList
from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_conversion import column_db_to_api
from cosmae.column.models_django import Column
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.management.display_txt.util import (
    DISPLAY_TXT_ORDER_CONFIG_KEY,
    get_display_txt_order_columns,
)
from cosmae.management.models_django import AlreadyInListException, ConfigValue
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user

router = Router()


class DisplayTxtOrderAppend(Schema):
    "API model for appending a column to the display text order"

    # pylint: disable=too-few-public-methods
    id_column_persistent: str


@router.get(
    "order",
    response={
        200: ColumnResponseList,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get(request: HttpRequest):
    "API method to get the column order for determining the display txt"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        column_query = get_display_txt_order_columns()
        return 200, ColumnResponseList(
            column_list=[column_db_to_api(column) for column in column_query]
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get columns for display text order.")


@router.post(
    "order/append",
    response={
        200: ColumnResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def append(request: HttpRequest, request_data: DisplayTxtOrderAppend):
    "API method for appending a column to the display text order by its persistent id."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        column = Column.most_recent_by_id(request_data.id_column_persistent)
        if not column.curated:
            return 400, ApiError(
                msg="Can only use curated columns in display text order."
            )
        ConfigValue.append_to_list(
            DISPLAY_TXT_ORDER_CONFIG_KEY, request_data.id_column_persistent
        )
        return 200, column_db_to_api(column)
    except AlreadyInListException:
        return 400, ApiError(msg="Can not add column that is already in list.")
    except Column.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Column does not exist.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not append column to display text order.")


@router.delete(
    "order/{id_column_persistent}",
    response={
        200: None,
        401: ApiError,
        403: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def remove(request: HttpRequest, id_column_persistent: str):
    "API method for deleting a column from the display text order by its persistent id."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Insufficient permissions.")
    try:
        ConfigValue.remove_from_list(DISPLAY_TXT_ORDER_CONFIG_KEY, id_column_persistent)
        return 200, None
    except Column.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Column does not exist.")
    except ValueError:
        return 200, None
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not remove column from display text order.")
