# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.column.api.integration.requests as req
import tests.column.common as c
from cosmae.column.models_django import Column as ColumnDb
from cosmae.column.models_django import OwnershipRequest as OwnershipRequestDb
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnMergeRequest


def test_unknown_user(auth_server):
    "Test the response when the user is not authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.column.api_permissions.check_user", mock):
        rsp = req.post_curation(
            server.url, c.id_column_persistent_test, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Check 401 response for missing cookies."
    server, _ = auth_server
    rsp = req.post_curation(server.url, c.id_column_persistent_test)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server):
    "Check correct status code for normal users."
    server, cookies = auth_server
    rsp = req.post_curation(server.url, c.id_column_persistent_test, cookies=cookies)
    assert rsp.status_code == 403


def test_not_existing(auth_server_commissioner):
    "Check correct status for non existing column."
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(server.url, c.id_column_persistent_test, cookies=cookies)
    assert rsp.status_code == 404


def test_curate(auth_server_commissioner, column_user):
    "Check whether a commissioner can curate a column."
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(server.url, column_user.id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    column = ColumnDb.most_recent_by_id(column_user.id_persistent)
    assert column.curated
    assert column.owner is None


def test_curate_removes_ownership_requests(
    auth_server_commissioner, ownership_request_user
):
    "Check whether a commissioner can curate a column."
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(
        server.url, ownership_request_user.id_column_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    column = ColumnDb.most_recent_by_id(ownership_request_user.id_column_persistent)
    assert column.curated
    assert column.owner is None
    assert 0 == len(
        OwnershipRequestDb.by_id_column_persistent_query_set(
            ownership_request_user.id_column_persistent
        )
    )


def test_curate_changes_mrs(auth_server_commissioner, column_user, user_editor):
    "Check whether a commissioner can curate a column."
    id_mr_persistent = "83cea683-d504-495f-b9dc-d14b025267a2"
    ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        assigned_to=column_user.owner,
        created_by=user_editor,
        state=ColumnMergeRequest.OPEN,
        id_origin_persistent="origin_for_test",
        id_destination_persistent=column_user.id_persistent,
        created_at=c.time_edit_test,
        id_persistent=id_mr_persistent,
    )
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(server.url, column_user.id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    assert (
        ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=id_mr_persistent
        )
        .get()
        .assigned_to
        is None
    )
