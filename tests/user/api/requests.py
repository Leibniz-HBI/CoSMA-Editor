"Requests for user API endpoints."

from cosmae.user import api


def delete_2fa(request, id_user_persistent):
    "Use API to delete 2FA for a user."
    return api.delete_user_2fa(request, id_user_persistent)
