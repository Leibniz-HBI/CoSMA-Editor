# pylint: disable=unused-argument,redefined-outer-name
"Tests for deleting 2FA for a user."

from allauth.mfa.models import Authenticator
from pytest import fixture
from requests import delete

from cosmae.exception import NotAuthenticatedException
from tests.user.api.requests import delete_2fa


def test_no_cookies(auth_server_commissioner):
    "Make sure missing cookies will return unauthenticated"
    response = delete(
        f"{auth_server_commissioner[0].url}/cosmae/api/user/2fa/some_id", timeout=900
    )
    assert response.status_code == 401


def test_unauthenticated(request_commissioner, user, mocker):
    "Make sure unauthenticated users cannot delete 2FA"
    mock = mocker.MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with mocker.patch("cosmae.user.api.check_user", mock):
        status, _ = delete_2fa(request_commissioner, user.id_persistent)
        assert status == 401


def test_insufficient_permissions(request_user, user):
    "Make sure users without sufficient permissions cannot delete 2FA"
    status, _ = delete_2fa(request_user, user.id_persistent)
    assert status == 403


@fixture
def authenticator_user(user):
    "Create an authenticator for the user"
    authenticator = Authenticator.objects.create(
        user=user, type=Authenticator.Type.TOTP, data={}
    )
    return authenticator


@fixture
def authenticator_user1(user1):
    "Create an authenticator for user1"
    authenticator = Authenticator.objects.create(
        user=user1, type=Authenticator.Type.TOTP, data={}
    )
    return authenticator


def test_delete_2fa(
    request_commissioner, user, user1, authenticator_user, authenticator_user1
):
    "Make sure deleting 2FA works"
    status, _ = delete_2fa(request_commissioner, user.id_persistent)
    assert status == 200
    authenticator = Authenticator.objects.all().get()
    assert authenticator.user.id_persistent == user1.id_persistent


def test_delete_2fa_self(request_commissioner, user_commissioner):
    "Make sure users cannot delete their own 2FA"
    status, _ = delete_2fa(request_commissioner, user_commissioner.id_persistent)
    assert status == 400
