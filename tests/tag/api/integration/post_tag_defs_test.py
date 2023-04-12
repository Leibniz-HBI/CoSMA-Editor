# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.tag.common as c
from tests.tag.api.integration import requests as r


def test_id_no_version(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def["id_persistent"] = c.id_tag_def_parent_persistent_test
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"] == "Tag definition with id_persistent "
        f"{c.id_tag_def_parent_persistent_test} has no previous version."
    )


def test_no_id_version(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def["version"] = 5
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Tag definition with name {c.name_tag_def_test} has version but no id_persistent."
    )


def test_concurrent_modification(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["tag_definitions"][0]
    created["type"] = "FLOAT"
    req = r.post_tag_def(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    created["type"] = "INNER"
    req = r.post_tag_def(live_server.url, created, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == (
        "There has been a concurrent modification "
        "to the tag definition with id_persistent "
        f'{created["id_persistent"]}.'
    )


def test_no_modification_is_returned(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["tag_definitions"][0]
    req = r.post_tag_def(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    tag_definitions = req.json()["tag_definitions"]
    assert len(tag_definitions) == 1
    assert tag_definitions[0] == created


def test_exists(auth_server, root_tag_def):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.return_value = "same_id"
    with patch("cosmae.tag.api.definitions.uuid4"):
        req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
        assert req.status_code == 200
        req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate id_persistent for tag definition with "
            f"name {c.name_tag_def_test}."
        )


def test_name_exists(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    id_persistent = req.json()["tag_definitions"][0]["id_persistent"]
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        "There is an existing tag definition with name "
        f"{c.name_tag_def_test} and id_parent_persistent {None}. "
        f"Its id_persistent is {id_persistent}."
    )


def test_no_parent(auth_server, child_tag_def):
    live_server, cookies = auth_server
    child_tag_def["id_parent_persistent"] = "unknown_id_persistent_test"
    req = r.post_tag_def(live_server.url, child_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == "There is no tag definition with id_persistent unknown_id_persistent_test."
    )


def test_unknown_type(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def["type"] = "UNKNOWN"
    req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == "Type UNKNOWN is not known."


def test_no_child_tag_allowed(auth_server, child_tag_def):
    live_server, cookies = auth_server
    req = r.post_tag_def(live_server.url, child_tag_def, cookies=cookies)
    assert req.status_code == 200
    id_parent_persistent = req.json()["tag_definitions"][0]["id_persistent"]
    invalid_child_tag_def = {
        "name": "some child",
        "type": "FLOAT",
        "id_parent_persistent": id_parent_persistent,
    }
    req = r.post_tag_def(live_server.url, invalid_child_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Tag definition with id_persistent {id_parent_persistent} "
        "is not allowed to have child tags."
    )


def test_bad_db(auth_server, root_tag_def):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.tag.models_django.TagDefinition.save", mock):
        req = r.post_tag_def(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."


def test_not_signed_in(live_server, root_tag_def):
    req = r.post_tag_def(live_server.url, root_tag_def)
    assert req.status_code == 401
