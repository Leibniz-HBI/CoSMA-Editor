# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,too-few-public-methods
from unittest.mock import MagicMock, patch

from allauth.account.models import EmailAddress
from django.db import DatabaseError

import tests.user.common as c
import tests.user.ssh.common as c_ssh
from cosmae.edit_session.models_django import EditSession
from cosmae.util import CosmaeUser
from tests.management.user.api.integration.requests import post_create_user


def test_no_cookies(live_server):
    rsp = post_create_user(
        live_server.url,
        {
            "username": "other",
            "email": "other@test.org",
            "names_personal": c.test_names_personal,
            "password": c.test_password,
        },
    )
    assert rsp.status_code == 401


def test_contributor(auth_server):
    live_server, cookies = auth_server
    rsp = post_create_user(
        live_server.url,
        {
            "username": "other",
            "email": "other@test.org",
            "names_personal": c.test_names_personal,
            "password": c.test_password,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_same_username(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    rsp = post_create_user(
        live_server.url,
        {
            "username": c.test_username_commissioner,
            "email": "other@test.org",
            "names_personal": c.test_names_personal_commissioner,
            "password": c.test_password_commissioner,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "status": 400,
        "errors": [
            {
                "message": "Username or mail address already in use.",
                "param": "",
                "code": "",
            }
        ],
    }


def test_same_email(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    rsp = post_create_user(
        live_server.url,
        {
            "username": "other",
            "email": c.test_email_commissioner,
            "names_personal": c.test_names_personal_commissioner,
            "password": c.test_password_commissioner,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "status": 400,
        "errors": [
            {
                "message": "Username or mail address already in use.",
                "param": "",
                "code": "",
            }
        ],
    }


def test_same_personal_names(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    rsp = post_create_user(
        live_server.url,
        {
            "username": "other",
            "email": "other@test.org",
            "names_personal": c.test_names_personal_commissioner,
            "password": c.test_password_commissioner,
            "ssh_key": c_ssh.ssh_key,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    user_created = CosmaeUser.objects.filter(username="other").get()
    assert user_created.email == "other@test.org"
    EmailAddress.objects.filter(
        user=user_created, email="other@test.org", primary=True, verified=False
    )


def test_rollback(auth_server_commissioner):
    "Test that a user is deleted when sending mail fails."
    live_server, cookies = auth_server_commissioner
    mock = MagicMock()
    mock.side_effect = Exception("test")
    with patch("cosmae.management.user.api.send_mail", mock):
        rsp = post_create_user(
            live_server.url,
            {
                "username": "other",
                "email": "other@test.org",
                "names_personal": c.test_names_personal_commissioner,
                "password": c.test_password_commissioner,
            },
            cookies=cookies,
        )
        assert rsp.status_code == 500
    assert len(CosmaeUser.objects.filter(username="other")) == 0
    assert (
        len(EditSession.objects.exclude(id_owner_persistent=c.test_uuid_commissioner))
        == 0
    )
    assert (
        len(
            EmailAddress.objects.filter(
                email="other@test.org", primary=True, verified=False
            )
        )
        == 0
    )


def test_bad_db(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    mock = MagicMock()
    mock.side_effect = DatabaseError("test")
    with patch("cosmae.util.CosmaeUser.save", mock):
        rsp = post_create_user(
            live_server.url,
            {
                "username": "other",
                "email": "other@test.org",
                "names_personal": c.test_names_personal,
                "password": c.test_password,
            },
            cookies=cookies,
        )
    assert rsp.status_code == 500
    assert rsp.json() == {
        "status": 500,
        "errors": [
            {
                "message": "Could not create user",
                "param": "",
                "code": "",
            }
        ],
    }
