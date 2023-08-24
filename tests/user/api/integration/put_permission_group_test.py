# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.api.integration.requests as req
import tests.user.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.util import CosmaeUser


def test_unknown_user(auth_server):
    "Test the correct response when user can not be authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.user.api.check_user", mock):
        rsp = req.put_permission_group(
            server.url,
            "7ed0d5d0-99e3-4445-846c-27afa6324116",
            "CONTRIBUTOR",
            cookies=cookies,
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Test the correct response for missing user data in request"
    server, _ = auth_server
    rsp = req.put_permission_group(
        server.url,
        "7ed0d5d0-99e3-4445-846c-27afa6324116",
        "CONTRIBUTOR",
    )
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server):
    """Test if a change permission group request is denied,
    when the requesting user has insufficient permissions."""
    server, cookies = auth_server
    rsp = req.put_permission_group(
        server.url,
        "7ed0d5d0-99e3-4445-846c-27afa6324116",
        "CONTRIBUTOR",
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_can_not_change_for_self(auth_server_commissioner):
    """Test that you can not change your own permissions.
    This is intended to ensure that there is always a commissioner."""
    server, cookies = auth_server_commissioner
    rsp = req.put_permission_group(
        server.url, c.test_uuid_commissioner, "APPLICANT", cookies=cookies
    )
    assert rsp.status_code == 400
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=c.test_uuid_commissioner
    ).get()
    assert db_user.permission_group == CosmaeUser.COMMISSIONER


def test_can_change_for_other(auth_server_commissioner, user):
    """Test if you can change the permission group of a user."""
    server, cookies = auth_server_commissioner
    rsp = req.put_permission_group(
        server.url, user.id_persistent, "EDITOR", cookies=cookies
    )
    assert rsp.status_code == 200
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=user.id_persistent
    ).get()
    assert db_user.permission_group == CosmaeUser.EDITOR


def test_non_existent_user(auth_server_commissioner):
    """Test for the correct status code when requesting
    to change the permission_group of a user who does not exist."""
    server, cookies = auth_server_commissioner
    rsp = req.put_permission_group(
        server.url, "7ed0d5d0-99e3-4445-846c-27afa6324116", "EDITOR", cookies=cookies
    )
    assert rsp.status_code == 404


def test_unknown_permission_group(auth_server_commissioner, user):
    "Test the correct error code when attempting to set an unknown permission group."
    server, cookies = auth_server_commissioner
    rsp = req.put_permission_group(
        server.url, user.id_persistent, "unknown", cookies=cookies
    )
    assert rsp.status_code == 400


def test_no_superuser_permission(auth_server_commissioner, super_user):
    "Test that the permission_group of a super_user can not be changed."
    server, cookies = auth_server_commissioner
    rsp = req.put_permission_group(
        server.url, super_user.id_persistent, "EDITOR", cookies=cookies
    )
    assert rsp.status_code == 400
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=super_user.id_persistent
    ).get()
    assert db_user.permission_group == CosmaeUser.APPLICANT
