# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from time import sleep
from unittest.mock import MagicMock, patch

from django.db import DatabaseError

from tests.column.api.integration import requests as r
from tests.utils import assert_versioned, sort_versioned
from cosmae.exception import NotAuthenticatedException
from cosmae.util import timestamp


def test_no_cookies(auth_server):
    server, _ = auth_server
    req = r.post_column_children(server.url, None)
    assert req.status_code == 401


def test_unauthenticated(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.column.api.check_user", mock):
        req = r.post_column_children(server.url, None, cookies=cookies)
    assert req.status_code == 401


def test_applicant(auth_server_applicant):
    server, cookies = auth_server_applicant
    req = r.post_column_children(server.url, None, cookies=cookies)
    assert req.status_code == 403


def test_empty_db(auth_server):
    live_server, cookies = auth_server
    req = r.post_column_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 200
    assert req.json()["column_list"] == []


def test_single_root_none(auth_server, root_column):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_column, cookies=cookies)
    assert req.status_code == 200
    root_column_rsp = req.json()["column_list"][0]
    req = r.post_column_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert len(columns) == 1
    assert columns[0] == root_column_rsp


def test_multi_root(auth_server, root_column):
    live_server, cookies = auth_server
    root_column1 = root_column.copy()
    req = r.post_column_list(
        live_server.url, [root_column, root_column1], cookies=cookies
    )
    assert req.status_code == 200
    root_column_rsps = req.json()["column_list"]
    req = r.post_column_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert_versioned(
        sort_versioned(columns),
        sort_versioned(root_column_rsps),
    )


def test_single_child(auth_server, root_column, child_column):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_column, cookies=cookies)
    assert req.status_code == 200
    root_column_rsp = req.json()["column_list"][0]
    root_column_rsp_id_persistent = root_column_rsp["id_persistent"]
    child_column["id_parent_persistent"] = root_column_rsp_id_persistent
    req = r.post_column(live_server.url, child_column, cookies=cookies)
    assert req.status_code == 200
    child_column_rsp = req.json()["column_list"][0]
    req = r.post_column_children(
        live_server.url, root_column_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert len(columns) == 1
    assert columns[0] == child_column_rsp


def test_multi_child(auth_server, root_column, child_column):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_column, cookies=cookies)
    assert req.status_code == 200
    root_column_rsp_id_persistent = req.json()["column_list"][0]["id_persistent"]
    child_column["id_parent_persistent"] = root_column_rsp_id_persistent
    child_column1 = child_column.copy()
    req = r.post_column_list(
        live_server.url, [child_column, child_column1], cookies=cookies
    )
    assert req.status_code == 200
    child_column_rsps = req.json()["column_list"]
    req = r.post_column_children(
        live_server.url, root_column_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert sort_versioned(columns) == sort_versioned(child_column_rsps)


def test_multi_child_history(auth_server, root_column, child_column):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_column, cookies=cookies)
    assert req.status_code == 200
    root_column_rsp_id_persistent = req.json()["column_list"][0]["id_persistent"]
    child_column["id_parent_persistent"] = root_column_rsp_id_persistent
    child_column1 = child_column.copy()
    before_children_time = timestamp()
    sleep(5)
    req = r.post_column_list(
        live_server.url, [child_column, child_column1], cookies=cookies
    )
    assert req.status_code == 200
    child_column_rsps = req.json()["column_list"]
    req = r.post_column_children(
        live_server.url,
        root_column_rsp_id_persistent,
        up_until_time=before_children_time,
        cookies=cookies,
    )
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert columns == []
    req = r.post_column_children(
        live_server.url, root_column_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert sort_versioned(columns) == sort_versioned(child_column_rsps)


def test_does_not_include_disabled(auth_server, column_disabled):
    live_server, cookies = auth_server
    rsp = r.post_column_children(live_server.url, None, cookies=cookies)
    assert rsp.status_code == 200
    assert rsp.json() == {"column_list": []}


def test_multi_child_include_hidden_for_owner(auth_server, root_column, child_column):
    live_server, cookies = auth_server
    req = r.post_column(live_server.url, root_column, cookies=cookies)
    assert req.status_code == 200
    root_column_rsp_id_persistent = req.json()["column_list"][0]["id_persistent"]
    child_column["id_parent_persistent"] = root_column_rsp_id_persistent
    child_column1 = child_column.copy()
    child_column1["hidden"] = True
    req = r.post_column_list(
        live_server.url, [child_column, child_column1], cookies=cookies
    )
    assert req.status_code == 200
    child_column_rsps = req.json()["column_list"]
    assert len(child_column_rsps) == 2
    req = r.post_column_children(
        live_server.url, root_column_rsp_id_persistent, cookies=cookies
    )
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert_versioned(sort_versioned(columns), sort_versioned(child_column_rsps))


def test_multi_child_exclude_hidden_for_non_owner(
    auth_server1, root_column, child_column
):
    live_server, cookies, cookies1 = auth_server1
    req = r.post_column(live_server.url, root_column, cookies=cookies)
    assert req.status_code == 200
    root_column_rsp_id_persistent = req.json()["column_list"][0]["id_persistent"]
    child_column["id_parent_persistent"] = root_column_rsp_id_persistent
    child_column1 = child_column.copy()
    child_column1["hidden"] = True
    req = r.post_column_list(
        live_server.url, [child_column, child_column1], cookies=cookies
    )
    assert req.status_code == 200
    child_column_rsps = req.json()["column_list"]
    assert len(child_column_rsps) == 2
    req = r.post_column_children(
        live_server.url, root_column_rsp_id_persistent, cookies=cookies1
    )
    assert req.status_code == 200
    columns = req.json()["column_list"]
    assert_versioned(columns, [child_column_rsps[0]])


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = DatabaseError()
    with patch("cosmae.column.models_django.ColumnQuerySet.children", mock):
        req = r.post_column_children(live_server.url, None, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Database Error."
