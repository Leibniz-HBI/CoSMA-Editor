# pylint: disable=unused-argument,redefined-outer-name
"tests for column search."
from pytest import fixture
from requests import get

import tests.column.common as c
from cosmae.column.api import get_search
from cosmae.column.models_django import ColumnNamePathCache


@fixture
def column_name_path_cache_entry(column):
    "name path cache entry for column"
    return ColumnNamePathCache.set_cache_entry(
        column.id, [column.name], column.time_edit
    )


@fixture
def column_parent_name_path_cache_entry(column_parent):
    "name path cache entry for column_parent"
    return ColumnNamePathCache.set_cache_entry(
        column_parent.id, [column_parent.name], column_parent.time_edit
    )


def test_no_user(live_server):
    "Make sure the system will return unauthorized for no cookies"
    rsp = get(live_server.url + "/cosmae/api/columns/search?term=test", timeout=900)
    assert rsp.status_code == 401


def test_applicant(request_applicant):
    "Make sure applicants can't use search"
    rsp = get_search(request_applicant, "bla")
    assert rsp[0] == 403


def test_history(
    request_user, column_name_path_cache_entry, column_parent_name_path_cache_entry
):
    "Make sure history works properly"
    status, rsp = get_search(request_user, "column", up_until_time=c.time_edit_test)
    assert status == 200
    assert rsp.id_persistent_list == [c.id_column_persistent_test]
    # Make sure most recent returns both columns
    status, rsp = get_search(request_user, "column")
    assert status == 200
    id_persistent_list = rsp.id_persistent_list
    assert len(id_persistent_list) == 2
    assert set(id_persistent_list) == {
        c.id_column_persistent_test,
        c.id_column_parent_persistent_test,
    }


def test_order(
    request_user, column_name_path_cache_entry, column_parent_name_path_cache_entry
):
    "Make sure history works properly"
    status, rsp = get_search(request_user, "parent")
    assert status == 200
    assert rsp.id_persistent_list == [
        c.id_column_parent_persistent_test,
        c.id_column_persistent_test,
    ]
    status, rsp = get_search(request_user, "column")
    assert status == 200
    assert rsp.id_persistent_list == [
        c.id_column_persistent_test,
        c.id_column_parent_persistent_test,
    ]
