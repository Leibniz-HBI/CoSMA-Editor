# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.tag.common as c
from tests.tag.api.integration import requests as r
from cosmae.column.models_django import ColumnHistory


def test_id_no_version(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def["id_persistent"] = c.id_tag_def_parent_persistent_test
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"] == "Column with id_persistent "
        f"{c.id_tag_def_parent_persistent_test} has no previous version."
    )


def test_no_id_version(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def["version"] = 5
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Column with name {c.name_column_test} has version but no id_persistent."
    )


def test_concurrent_modification(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["column_list"][0]
    created["name"] = "changed first"
    req = r.post_column(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    created["name"] = "changed second"
    req = r.post_column(live_server.url, created, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == (
        "There has been a concurrent modification "
        "to the column with id_persistent "
        f'{created["id_persistent"]}.'
    )


def test_no_modification_is_returned(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["column_list"][0]
    req = r.post_column(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert len(columns) == 1
    assert columns[0] == created


def test_exists(auth_server, root_tag_def):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.return_value = "7dc7030c-35bd-49d7-9150-07e6f97c4b05"
    with patch("cosmae.column.api.uuid4", mock):
        req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
        assert req.status_code == 200
        req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate id_persistent for column with "
            f"name {c.name_column_test}."
        )


def test_name_exists(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    id_persistent = req.json()["column_list"][0]["id_persistent"]
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        "There is an existing column with name "
        f"{c.name_column_test} and id_parent_persistent {None}. "
        f"Its id_persistent is {id_persistent}."
    )


def test_self_parent(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    rsp_tag_def = req.json()["column_list"][0]
    id_persistent = rsp_tag_def["id_persistent"]
    version = rsp_tag_def["version"]
    new_tag_def = root_tag_def.copy()
    new_tag_def["id_persistent"] = id_persistent
    new_tag_def["id_parent_persistent"] = id_persistent
    new_tag_def["version"] = version
    req = r.post_column(live_server.url, new_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == ("Can not set a column as its own parent.")


def test_no_permissions(auth_server1, root_tag_def):
    live_server, cookies, cookies_user_1 = auth_server1
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    rsp_tag_def = req.json()["column_list"][0]
    id_persistent = rsp_tag_def["id_persistent"]
    version = rsp_tag_def["version"]
    new_tag_def = root_tag_def.copy()
    new_tag_def["id_persistent"] = id_persistent
    new_tag_def["version"] = version
    new_tag_def["name"] = "changed name"
    req = r.post_column(live_server.url, new_tag_def, cookies=cookies_user_1)
    assert req.status_code == 403


def test_change_description(auth_server, root_tag_def):
    test_description = "Changed description for test"
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["column_list"][0]
    id_persistent = created["id_persistent"]
    version = created["version"]
    new_tag_def = root_tag_def.copy()
    new_tag_def["id_persistent"] = id_persistent
    new_tag_def["version"] = version
    new_tag_def["description"] = test_description
    req = r.post_column(live_server.url, new_tag_def, cookies=cookies)
    assert req.status_code == 200
    assert req.json()["column_list"][0]["description"] == test_description


def test_disable(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["column_list"][0]
    id_persistent = created["id_persistent"]
    version = created["version"]
    new_tag_def = root_tag_def.copy()
    new_tag_def["id_persistent"] = id_persistent
    new_tag_def["version"] = version
    new_tag_def["disabled"] = True
    req = r.post_column(live_server.url, new_tag_def, cookies=cookies)
    assert req.status_code == 200
    assert req.json()["column_list"][0]["disabled"]
    versions = ColumnHistory.objects.filter(id_persistent=id_persistent).order_by("id")
    assert len(versions) == 2
    assert versions[1].disabled


def test_change_type(auth_server, root_tag_def):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["column_list"][0]
    id_persistent = created["id_persistent"]
    version = created["version"]
    new_tag_def = root_tag_def.copy()
    new_tag_def["id_persistent"] = id_persistent
    new_tag_def["version"] = version
    new_tag_def["type"] = "FLOAT"
    req = r.post_column(live_server.url, new_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == "Tried to change unmodifiable field type."


def test_no_parent(auth_server, child_tag_def):
    live_server, cookies = auth_server
    child_tag_def["id_parent_persistent"] = "unknown_id_persistent_test"
    req = r.post_column(live_server.url, child_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == "There is no column with id_persistent unknown_id_persistent_test."
    )


def test_unknown_type(auth_server, root_tag_def):
    live_server, cookies = auth_server
    root_tag_def["type"] = "UNKNOWN"
    req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == "Type UNKNOWN is not known."


def test_bad_db(auth_server, root_tag_def):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.column.models_django.ColumnHistory.save", mock):
        req = r.post_column(live_server.url, root_tag_def, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."


def test_not_signed_in(live_server, root_tag_def):
    req = r.post_column(live_server.url, root_tag_def)
    assert req.status_code == 401
