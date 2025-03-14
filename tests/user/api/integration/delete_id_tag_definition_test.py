# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.user.api.integration.requests as req
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.user.api.check_user", mock):
        rsp = req.delete_id_tag_definition_persistent(server.url, "id", cookies=cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.delete_id_tag_definition_persistent(server.url, "id")
    assert rsp.status_code == 401


def test_existing_tag_definition(
    auth_server, tag_def_user_profile, tag_def_user_profile1
):
    server, cookies = auth_server
    rsp = req.post_append_id_tag_definition_persistent(
        server.url, tag_def_user_profile.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req.post_append_id_tag_definition_persistent(
        server.url, tag_def_user_profile1.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    rsp = req.delete_id_tag_definition_persistent(
        server.url, tag_def_user_profile.id_persistent, cookies
    )
    assert rsp.status_code == 200
    rsp = req.get_self(server.url, cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert [
        tag_def["id_persistent"] for tag_def in json["data"]["tag_definition_list"]
    ] == [tag_def_user_profile1.id_persistent]
