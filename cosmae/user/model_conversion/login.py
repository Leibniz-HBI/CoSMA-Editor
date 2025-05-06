"Model conversion for login information."

from cosmae.column.models_conversion import tag_definition_db_to_api
from cosmae.column.models_django import Column as TagDefinitionDb
from cosmae.edit_session.api import edit_session_db_to_api
from cosmae.user.model_conversion.public import permission_group_db_to_api
from cosmae.user.models_api.login import LoginResponse
from cosmae.util import CosmaeUser


def user_db_to_login_response(user: CosmaeUser):
    "Converts a django user to a login response."
    tag_definition_db = user.tag_definitions.copy()
    tag_definitions = []
    for id_tag_definition_persistent in tag_definition_db:
        try:
            tag_definition = TagDefinitionDb.most_recent_by_id(
                id_tag_definition_persistent
            )
            tag_definitions.append(tag_definition_db_to_api(tag_definition))
        except TagDefinitionDb.DoesNotExist:  # pylint: disable=no-member
            user.remove_tag_definition_by_id(id_tag_definition_persistent)
    return LoginResponse(
        username=user.get_username(),
        id_persistent=str(user.id_persistent),
        names_personal=user.first_name,
        names_family=user.last_name,
        email=user.email,
        tag_definition_list=tag_definitions,
        permission_group=permission_group_db_to_api[user.permission_group],
        edit_session=edit_session_db_to_api(user.edit_session),
    )
