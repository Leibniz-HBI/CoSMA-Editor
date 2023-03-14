# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import DatabaseError

from tests.tag.api.integration import requests as r


def test_empty_db(live_server):
    req = r.post_tag_def_children(live_server.url, None)
    assert req.status_code == 200
    assert req.json()["tag_definitions"] == []


def test_single_root_none(live_server, root_tag_def):
    req = r.post_tag_def(live_server.url, root_tag_def)
    assert req.status_code == 200
    root_tag_def_rsp = req.json()["tag_definitions"][0]
    req = r.post_tag_def_children(live_server.url, None)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 1
    assert tag_definitions[0] == root_tag_def_rsp


def test_multi_root(live_server, root_tag_def):
    root_tag_def1 = root_tag_def.copy()
    req = r.post_tag_defs(live_server.url, [root_tag_def, root_tag_def1])
    assert req.status_code == 200
    root_tag_def_rsps = req.json()["tag_definitions"]
    req = r.post_tag_def_children(live_server.url, None)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 2
    assert tag_definitions[0] == root_tag_def_rsps[0]
    assert tag_definitions[1] == root_tag_def_rsps[1]


def test_single_child(live_server, root_tag_def, child_tag_def):
    req = r.post_tag_def(live_server.url, root_tag_def)
    assert req.status_code == 200
    root_tag_def_rsp = req.json()["tag_definitions"][0]
    root_tag_def_rsp_id_persistent = root_tag_def_rsp["id_persistent"]
    child_tag_def["id_parent_persistent"] = root_tag_def_rsp_id_persistent
    req = r.post_tag_def(live_server.url, child_tag_def)
    assert req.status_code == 200
    child_tag_def_rsp = req.json()["tag_definitions"][0]
    req = r.post_tag_def_children(live_server.url, root_tag_def_rsp_id_persistent)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 1
    assert tag_definitions[0] == child_tag_def_rsp


def test_multi_child(live_server, root_tag_def, child_tag_def):
    req = r.post_tag_def(live_server.url, root_tag_def)
    assert req.status_code == 200
    root_tag_def_rsp_id_persistent = req.json()["tag_definitions"][0]["id_persistent"]
    child_tag_def["id_parent_persistent"] = root_tag_def_rsp_id_persistent
    child_tag_def1 = child_tag_def.copy()
    req = r.post_tag_defs(live_server.url, [child_tag_def, child_tag_def1])
    assert req.status_code == 200
    child_tag_def_rsps = req.json()["tag_definitions"]
    req = r.post_tag_def_children(live_server.url, root_tag_def_rsp_id_persistent)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 2
    assert tag_definitions[0] == child_tag_def_rsps[0]
    assert tag_definitions[1] == child_tag_def_rsps[1]


def test_bad_db(live_server):
    mock = MagicMock()
    mock.side_effect = DatabaseError()
    with patch("cosmae.tag.models_django.TagDefinition.most_recent_children", mock):
        req = r.post_tag_def_children(live_server.url, None)
    assert req.status_code == 500
    assert req.json()["msg"] == "Database Error."
