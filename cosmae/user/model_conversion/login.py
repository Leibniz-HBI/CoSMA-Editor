"Model conversion for login information."

from cosmae.edit_session.api import edit_session_db_to_api
from cosmae.user.model_conversion.public import permission_group_db_to_api
from cosmae.user.models_api.login import LoginResponse
from cosmae.util import CosmaeUser


def user_db_to_login_response(user: CosmaeUser):
    "Converts a django user to a login response."
    return LoginResponse(
        username=user.get_username(),
        id_persistent=str(user.id_persistent),
        names_personal=user.first_name,
        names_family=user.last_name,
        email=user.email,
        id_column_persistent_list=user.columns,
        permission_group=permission_group_db_to_api[user.permission_group],
        edit_session=edit_session_db_to_api(user.edit_session),
        password_changed=user.password_changed,
    )
