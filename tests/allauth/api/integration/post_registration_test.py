# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.db import DatabaseError

import tests.user.common as c
from tests.allauth.api.integration.requests import get_config, post_register
from tests.utils import assert_versioned


def test_same_name(auth_server):
    live_server, _ = auth_server
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_register(
        live_server.url,
        {
            "username": c.test_username,
            "email": "other@test.org",
            "names_personal": c.test_names_personal,
            "password": c.test_password,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "errors": [
            {
                "code": "username_taken",
                "message": "A user with that username already exists.",
                "param": "username",
            }
        ],
        "status": 400,
    }


def test_same_email(auth_server):
    live_server, _ = auth_server
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_register(
        live_server.url,
        {
            "username": "other",
            "email": c.test_email,
            "names_personal": c.test_names_personal,
            "password": c.test_password,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "errors": [
            {
                "code": "email_taken",
                "message": "A user is already registered with this email address.",
                "param": "email",
            }
        ],
        "status": 400,
    }


def test_same_names(auth_server):
    live_server, cookies = auth_server
    uuid = uuid4()
    uuidMock = MagicMock(return_value=uuid)
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    with patch("cosmae.user.adapter.uuid4", uuidMock):
        rsp = post_register(
            live_server.url,
            {
                "username": "other",
                "email": "other@test.org",
                "names_personal": c.test_names_personal,
                "password": c.test_password,
            },
            cookies=cookies,
        )
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
        {
            "status": 200,
            "meta": {"is_authenticated": True},
            "data": {
                "methods": [],
                "user": {
                    "display": "other",
                    "email": "other@test.org",
                    "username": "other",
                    "has_usable_password": True,
                },
            },
        },
        version_key="id",
    )


def test_bad_db(auth_server):
    live_server, _ = auth_server
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    mock = MagicMock()
    mock.side_effect = DatabaseError("test")
    with patch("cosmae.util.CosmaeUser.save", mock):
        req = post_register(
            live_server.url,
            {
                "username": "other",
                "email": "other@test.org",
                "names_personal": c.test_names_personal,
                "password": c.test_password,
            },
            cookies=cookies,
        )
    assert req.status_code == 500
