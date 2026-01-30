# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, patch

from django.db import DatabaseError
from requests import post

import tests.column.common as c
from tests.column.api import requests as r
from tests.utils import assert_versioned


def test_no_cookies(live_server, mock_csrf):
    rsp = post(
        live_server.url + "/cosmae/api/columns/children",
        json={"id_parent_persistent": None},
        timeout=900,
        cookies=None,
    )
    assert rsp.status_code == 401


def test_unauthenticated(request_no_user):
    status_code, _ = r.post_column_children(request_no_user, None)
    assert status_code == 401


def test_applicant(request_applicant):
    status_code, _ = r.post_column_children(request_applicant, None)
    assert status_code == 403


def test_empty_db(request_user):
    status_code, rsp = r.post_column_children(request_user, None)
    assert status_code == 200
    assert rsp.dict()["column_list"] == []


def test_single_root_none(request_user, column_parent):
    status_code, rsp = r.post_column_children(request_user, None)
    assert status_code == 200
    columns = rsp.dict()["column_list"]
    assert_versioned(
        columns,
        [c.column_parent_rsp],
    )


def test_multi_root(request_user, column_parent, column_curated):
    status_code, rsp = r.post_column_children(request_user, None)
    assert status_code == 200
    assert_versioned(
        rsp.dict()["column_list"], [c.column_curated_rsp, c.column_parent_rsp]
    )


def test_single_child(request_user, column_parent, column_child_0):
    status_code, rsp = r.post_column_children(
        request_user, c.id_column_parent_persistent_test
    )
    assert status_code == 200
    assert_versioned(rsp.dict()["column_list"], [c.column_child_0_rsp])


def test_multi_child(request_user, column_parent, column_child_0, column_child_1):
    status_code, rsp = r.post_column_children(request_user, column_parent.id_persistent)
    assert status_code == 200
    assert_versioned(
        rsp.dict()["column_list"],
        [c.column_child_1_rsp, c.column_child_0_rsp],
        list_sort_key=lambda k: k["id_persistent"],
    )


def test_multi_child_history(request_user, column_parent, column_child_0):
    status_code, rsp = r.post_column_children(
        request_user,
        column_parent.id_persistent,
        up_until_time=c.time_edit_test,
    )
    assert status_code == 200
    assert rsp.dict()["column_list"] == []
    status_code, rsp = r.post_column_children(request_user, column_parent.id_persistent)
    assert status_code == 200
    assert_versioned(rsp.dict()["column_list"], [c.column_child_0_rsp])


def test_does_not_include_disabled(request_user, column_disabled):
    status_code, rsp = r.post_column_children(request_user, None)
    assert status_code == 200
    assert rsp.dict() == {"column_list": []}


def test_multi_child_include_hidden_for_owner(
    request_user, column_parent, column_child_0, column_child_1_hidden
):
    status_code, rsp = r.post_column_children(request_user, column_parent.id_persistent)
    assert status_code == 200
    assert_versioned(
        rsp.dict()["column_list"],
        [c.column_child_1_hidden_rsp, c.column_child_0_rsp],
        list_sort_key=lambda k: k["id_persistent"],
    )


def test_multi_child_exclude_hidden_for_non_owner(
    request_user1, column_parent, column_child_0, column_child_1_hidden
):
    status_code, rsp = r.post_column_children(
        request_user1, column_parent.id_persistent
    )
    assert status_code == 200
    assert_versioned(
        rsp.dict()["column_list"],
        [c.column_child_0_rsp],
        list_sort_key=lambda k: k["id_persistent"],
    )


def test_bad_db(request_user):
    mock = MagicMock()
    mock.side_effect = DatabaseError()
    with patch("cosmae.column.models_django.ColumnQuerySet.children", mock):
        status_code, rsp = r.post_column_children(request_user, None)
    assert status_code == 500
    assert rsp.dict()["msg"] == "Database Error."
