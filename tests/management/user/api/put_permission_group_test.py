# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

from requests import put

import tests.management.user.api.requests as req
import tests.user.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.util import CosmaeUser


def test_unknown_user(request_commissioner):
    "Test the correct response when user can not be authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.management.user.api.check_user", mock):
        status, _ = req.put_permission_group(
            request_commissioner,
            "7ed0d5d0-99e3-4445-846c-27afa6324116",
            "CONTRIBUTOR",
        )
    assert status == 401


def test_no_cookies(auth_server):
    "Test the correct response for missing user data in request"
    server, _ = auth_server
    rsp = put(
        server.url
        + "/cosmae/api/manage/user/id/7ed0d5d0-99e3-4445-846c-27afa6324116/permission_group",
        json={"permission_group": "CONTRIBUTOR"},
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_insufficient_permissions(request_user):
    """Test if a change permission group request is denied,
    when the requesting user has insufficient permissions."""
    status, _ = req.put_permission_group(
        request_user,
        "7ed0d5d0-99e3-4445-846c-27afa6324116",
        "CONTRIBUTOR",
    )
    assert status == 403


def test_can_not_change_for_self(request_commissioner):
    """Test that you can not change your own permissions.
    This is intended to ensure that there is always a commissioner."""
    status, _ = req.put_permission_group(
        request_commissioner, c.test_uuid_commissioner, "APPLICANT"
    )
    assert status == 400
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=c.test_uuid_commissioner
    ).get()
    assert db_user.permission_group == CosmaeUser.COMMISSIONER


def test_can_change_for_other(request_commissioner, user):
    """Test if you can change the permission group of a user."""
    status, _ = req.put_permission_group(
        request_commissioner, user.id_persistent, "EDITOR"
    )
    assert status == 200
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=user.id_persistent
    ).get()
    assert db_user.permission_group == CosmaeUser.EDITOR


def test_can_disable(request_commissioner, user):
    """Test if you can change the permission group of a user."""
    status, _ = req.put_permission_group(
        request_commissioner, user.id_persistent, None, is_active=False
    )
    assert status == 200
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=user.id_persistent
    ).get()
    assert db_user.permission_group == CosmaeUser.CONTRIBUTOR
    assert not db_user.is_active


def test_non_existent_user(request_commissioner):
    """Test for the correct status code when requesting
    to change the permission_group of a user who does not exist."""
    status, _ = req.put_permission_group(
        request_commissioner, "7ed0d5d0-99e3-4445-846c-27afa6324116", "EDITOR"
    )
    assert status == 404


def test_unknown_permission_group(request_commissioner, user):
    "Test the correct error code when attempting to set an unknown permission group."
    status, _ = req.put_permission_group(
        request_commissioner, user.id_persistent, "unknown"
    )
    assert status == 400


def test_no_superuser_permission(request_commissioner, super_user):
    "Test that the permission_group of a super_user can not be changed."
    status, _ = req.put_permission_group(
        request_commissioner, super_user.id_persistent, "EDITOR"
    )
    assert status == 400
    db_user = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=super_user.id_persistent
    ).get()
    assert db_user.permission_group == CosmaeUser.APPLICANT
