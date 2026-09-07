"Test methods for user management API requests."

from cosmae.management.user import api


def put_permission_group(
    request, id_user_persistent, permission_group=None, is_active=None
):
    "Set the permission group of a user"
    request_body = api.PutGroupRequest(
        permission_group=permission_group, is_active=is_active
    )
    return api.put_user_permission_group(request, id_user_persistent, request_body)
