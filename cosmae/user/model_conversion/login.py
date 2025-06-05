"Model conversion for login information."

from cosmae.column.models_conversion import column_db_to_api
from cosmae.column.models_django import Column as ColumnDb
from cosmae.edit_session.api import edit_session_db_to_api
from cosmae.user.model_conversion.public import permission_group_db_to_api
from cosmae.user.models_api.login import LoginResponse
from cosmae.util import CosmaeUser


def user_db_to_login_response(user: CosmaeUser):
    "Converts a django user to a login response."
    column_db = user.columns.copy()
    column_list_api = []
    for id_column_persistent in column_db:
        try:
            column = ColumnDb.most_recent_by_id(id_column_persistent)
            column_list_api.append(column_db_to_api(column))
        except ColumnDb.DoesNotExist:  # pylint: disable=no-member
            user.remove_column_by_id(id_column_persistent)
    return LoginResponse(
        username=user.get_username(),
        id_persistent=str(user.id_persistent),
        names_personal=user.first_name,
        names_family=user.last_name,
        email=user.email,
        column_list=column_list_api,
        permission_group=permission_group_db_to_api[user.permission_group],
        edit_session=edit_session_db_to_api(user.edit_session),
        password_changed=user.password_changed,
    )
