"Model conversions for user information."
from cosmae.user.models_api.public import PublicUserInfo
from cosmae.util import CosmaeUser

permission_group_db_to_api = {
    CosmaeUser.APPLICANT: "APPLICANT",
    CosmaeUser.READER: "READER",
    CosmaeUser.CONTRIBUTOR: "CONTRIBUTOR",
    CosmaeUser.EDITOR: "EDITOR",
    CosmaeUser.COMMISSIONER: "COMMISSIONER",
}


def user_db_to_public_user_info(user):
    "Convert a django user to a public user info"
    if user is None:
        return None
    return PublicUserInfo(
        username=user.get_username(),
        id_persistent=str(user.id_persistent),
        permission_group=permission_group_db_to_api[user.permission_group],
    )


def user_db_to_public_user_info_dict(user: CosmaeUser):
    "Convert a django user to a public user info dictionary"
    if user is None:
        return None
    return {
        "username": user.get_username(),
        "id_persistent": str(user.id_persistent),
        "permission_group": permission_group_db_to_api[user.permission_group],
        "id": user.id,
    }
