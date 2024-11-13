# pylint: disable=missing-module-docstring,too-many-arguments,unused-argument
from unittest.mock import MagicMock, patch

import tests.permissions.api.integration.requests as req
import tests.tag.common as ct
import tests.user.common as cu
from cosmae.exception import NotAuthenticatedException


def test_get_permissions_unknown_user(auth_server):
    "Make sure an unauthenticated user gets correct status code for getting permissions."
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.permissions.api.check_user", mock):
        rsp = req.get_permissions_for_resource(
            server.url, ct.id_tag_def_persistent_test_user, cookies=cookies
        )
    assert rsp.status_code == 401


def test_put_permissions_unknown_user(auth_server):
    "Make sure an unauthenticated user gets correct status code for setting permissions."
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.permissions.api.check_user", mock):
        rsp = req.put_permission(
            server.url,
            ct.id_tag_def_persistent_test,
            cu.test_uuid,
            cookies=cookies,
        )
    assert rsp.status_code == 401


def test_get_permissions_no_cookies(auth_server):
    "Make sure a request with no cookies gets correct status code for getting permissions."
    server, _ = auth_server
    rsp = req.get_permissions_for_resource(server.url, ct.id_tag_def_persistent_test)
    assert rsp.status_code == 401


def test_put_permissions_no_cookies(auth_server):
    "Make sure a request without cookies gets correct status code for setting permissions."
    server, _ = auth_server
    rsp = req.put_permission(server.url, ct.id_tag_def_persistent_test, cu.test_uuid)
    assert rsp.status_code == 401


def test_get_permissions_applicant(auth_server_applicant):
    "Make sure an applicant user gets correct status code for getting permissions."
    server, cookies = auth_server_applicant
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 403


def test_put_permissions_applicant(auth_server_applicant):
    "Make sure an applicant user gets correct status code for setting permissions."
    server, cookies = auth_server_applicant
    rsp = req.put_permission(
        server.url, ct.id_tag_def_persistent_test, cu.test_uuid, cookies=cookies
    )
    assert rsp.status_code == 403


def test_get_permissions_other_user(auth_server_commissioner, tag_def):
    "Make sure a user who is not an owner gets correct status code for getting permissions."
    server, cookies = auth_server_commissioner
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 403


def test_put_permissions_other_user(auth_server_commissioner, tag_def):
    "Make sure a user who is not the owner gets correct status code for setting permissions."
    server, cookies = auth_server_commissioner
    rsp = req.put_permission(
        server.url, ct.id_tag_def_persistent_test, cu.test_uuid, cookies=cookies
    )
    assert rsp.status_code == 403


def test_get_permissions_no_resource(auth_server):
    "Make sure correct status is returned for missing resource when getting permission."
    server, cookies = auth_server
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 404


def test_put_permissions_no_resource(auth_server):
    "Make sure correct status is returned for missing resource when setting permission."
    server, cookies = auth_server
    rsp = req.put_permission(
        server.url, ct.id_tag_def_persistent_test, cu.test_uuid1, cookies=cookies
    )
    assert rsp.status_code == 404


def test_put_permissions_missing_user(auth_server, tag_def):
    "Make sure correct status is returned for missing resource when setting permission."
    server, cookies = auth_server
    rsp = req.put_permission(
        server.url, ct.id_tag_def_persistent_test, cu.test_uuid1, cookies=cookies
    )
    assert rsp.status_code == 404


def test_set_and_get_permissions_other_user(auth_server, tag_def, user1, user_editor):
    "Make sure can set and get permissions"
    server, cookies = auth_server
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"user_permission_list": []}
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid1,
        read=True,
        write=False,
        cookies=cookies,
    )
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid_editor,
        read=False,
        write=True,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "user_permission_list": [
            {
                "id_user_persistent": cu.test_uuid1,
                "read": True,
                "write": False,
            },
            {
                "id_user_persistent": cu.test_uuid_editor,
                "read": False,
                "write": True,
            },
        ]
    }


def test_can_remove_existing(auth_server, tag_def, user1):
    "Make sure can set and get permissions"
    server, cookies = auth_server
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid1,
        read=True,
        write=False,
        cookies=cookies,
    )
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "user_permission_list": [
            {
                "id_user_persistent": cu.test_uuid1,
                "read": True,
                "write": False,
            },
        ]
    }
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid1,
        read=False,
        write=False,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"user_permission_list": []}


def test_can_set_partial(auth_server, tag_def, user1):
    "Make sure can set and get permissions"
    server, cookies = auth_server
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid1,
        read=True,
        write=False,
        cookies=cookies,
    )
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "user_permission_list": [
            {
                "id_user_persistent": cu.test_uuid1,
                "read": True,
                "write": False,
            },
        ]
    }
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid1,
        write=True,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "user_permission_list": [
            {
                "id_user_persistent": cu.test_uuid1,
                "read": True,
                "write": True,
            },
        ]
    }


def test_can_set_partial_initial(auth_server, tag_def, user1):
    "Make sure can set initial permission with partial payload."
    server, cookies = auth_server
    rsp = req.put_permission(
        server.url,
        ct.id_tag_def_persistent_test,
        cu.test_uuid1,
        read=True,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_permissions_for_resource(
        server.url, ct.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "user_permission_list": [
            {
                "id_user_persistent": cu.test_uuid1,
                "read": True,
                "write": False,
            },
        ]
    }
