# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
import tests.user.common as cu
from cosmae.util.auth import NotAuthenticatedException


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = req_contrib.patch_contribution(
        live_server.url, "id-test", dict(name="new name")
    )
    assert rsp.status_code == 401


def test_invalid_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        live_server, cookies = auth_server
        rsp = req_contrib.patch_contribution(
            live_server.url, "id-test", dict(name="name"), cookies=cookies
        )
        assert rsp.status_code == 401


def test_404(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.patch_contribution(
        live_server.url, str(uuid4()), dict(name="new name"), cookies=cookies
    )
    assert rsp.status_code == 404


def test_wrong_user(auth_server1):
    live_server, cookies0, cookies1 = auth_server1
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies0
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, dict(name="new name"), cookies=cookies1
    )
    assert rsp.status_code == 404


def test_patch_name(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, dict(name="new name"), cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == "new name"
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["anonymous"]
    assert not contribution["author"]
    assert not contribution["has_header"]


def test_patch_description(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        dict(description="new description"),
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == "new description"
    assert contribution["state"] == "UPLOADED"
    assert contribution["anonymous"]
    assert not contribution["author"]
    assert not contribution["has_header"]


def test_patch_header_flag(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, dict(has_header=True), cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["anonymous"]
    assert not contribution["author"]
    assert contribution["has_header"]


def test_patch_anonymous(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, dict(anonymous=False), cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert not contribution["anonymous"]
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]


def test_patch_all(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url,
        id_persistent,
        dict(
            name="new name",
            description="new description",
            has_header=True,
            anonymous=False,
        ),
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == "new name"
    assert contribution["description"] == "new description"
    assert contribution["state"] == "UPLOADED"
    assert not contribution["anonymous"]
    assert contribution["author"] == cu.test_username
    assert contribution["has_header"]


def test_unknown_field(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.patch_contribution(
        live_server.url, id_persistent, dict(foo="bar"), cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req_contrib.get_contribution(live_server.url, id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    contribution = rsp.json()
    assert contribution["name"] == c.contribution_post0["name"]
    assert contribution["description"] == c.contribution_post0["description"]
    assert contribution["state"] == "UPLOADED"
    assert contribution["anonymous"]
    assert not contribution["author"]
    assert not contribution["has_header"]
