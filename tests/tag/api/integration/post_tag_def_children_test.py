# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import DatabaseError

from tests.tag.api.integration import requests as r
from tests.utils import assert_versioned, sort_versioned


def test_empty_db(auth_server):
    live_server, cookies = auth_server
    req = r.post_tag_def_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 200
    assert req.json()["tag_definitions"] == []


def test_single_root_none(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    root_tag_def_rsp = req.json()["tag_definitions"][0]
    req = r.post_tag_def_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 1
    assert tag_definitions[0] == root_tag_def_rsp


def test_multi_root(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def1 = root_tag_def.copy()
    req = r.post_tag_defs(
        live_server.url, [root_tag_def, root_tag_def1], cookies=cookies
    )
    assert req.status_code == 200
    root_tag_def_rsps = req.json()["tag_definitions"]
    req = r.post_tag_def_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert_versioned(
        sort_versioned(tag_definitions),
        sort_versioned(root_tag_def_rsps),
    )


def test_single_child(auth_server, root_tag_def, child_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    root_tag_def_rsp = req.json()["tag_definitions"][0]
    root_tag_def_rsp_id_persistent = root_tag_def_rsp["id_persistent"]
    child_tag_def["id_parent_persistent"] = root_tag_def_rsp_id_persistent
    req = r.post_tag_def(live_server.url, child_tag_def, cookies=cookies)
    assert req.status_code == 200
    child_tag_def_rsp = req.json()["tag_definitions"][0]
    req = r.post_tag_def_children(
        live_server.url, root_tag_def_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 1
    assert tag_definitions[0] == child_tag_def_rsp


def test_multi_child(auth_server, root_tag_def, child_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    root_tag_def_rsp_id_persistent = req.json()["tag_definitions"][0]["id_persistent"]
    child_tag_def["id_parent_persistent"] = root_tag_def_rsp_id_persistent
    child_tag_def1 = child_tag_def.copy()
    req = r.post_tag_defs(
        live_server.url, [child_tag_def, child_tag_def1], cookies=cookies
    )
    assert req.status_code == 200
    child_tag_def_rsps = req.json()["tag_definitions"]
    req = r.post_tag_def_children(
        live_server.url, root_tag_def_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert sort_versioned(tag_definitions) == sort_versioned(child_tag_def_rsps)


def test_multi_child_no_disabled(auth_server, root_tag_def, child_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    root_tag_def_rsp_id_persistent = req.json()["tag_definitions"][0]["id_persistent"]
    child_tag_def["id_parent_persistent"] = root_tag_def_rsp_id_persistent
    child_tag_def1 = child_tag_def.copy()
    child_tag_def1["hidden"] = True
    req = r.post_tag_defs(
        live_server.url, [child_tag_def, child_tag_def1], cookies=cookies
    )
    assert req.status_code == 200
    child_tag_def_rsps = req.json()["tag_definitions"]
    req = r.post_tag_def_children(
        live_server.url, root_tag_def_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert_versioned(
        sort_versioned(tag_definitions), sort_versioned(child_tag_def_rsps)
    )


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = DatabaseError()
    with patch("cosmae.tag.models_django.TagDefinition.most_recent_children", mock):
        req = r.post_tag_def_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Database Error."


def test_not_signed_in(live_server):
    req = r.post_tag_def_children(live_server.url, None)
    assert req.status_code == 401
