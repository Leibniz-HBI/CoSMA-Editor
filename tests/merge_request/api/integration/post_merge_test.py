# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.merge_request.api.integration.requests as req
import tests.merge_request.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnMergeRequest


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.merge_request.api.check_user", mock):
        rsp = req.post_start_merge(
            server.url, c.id_persistent_merge_request, cookies=cookies
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.post_start_merge(server.url, c.id_persistent_merge_request)
    assert rsp.status_code == 401


def test_no_mr(auth_server):
    server, cookies = auth_server
    rsp = req.post_start_merge(
        server.url, "4e679630-241e-40f8-b175-c4b7916be379", cookies=cookies
    )
    assert rsp.status_code == 404


def test_wrong_user(auth_server1, merge_request_user):
    server, _, cookies = auth_server1
    rsp = req.post_start_merge(
        server.url, str(merge_request_user.id_persistent), cookies=cookies
    )
    assert rsp.status_code == 403
    assert rsp.json() == {
        "msg": "You do not have write permissions for the destination column."
    }


def test_sets_conflicts_state(
    auth_server,
    merge_request_user,
    conflict_resolutions_replace_replace,
):
    "API endpoint just sets the state to CONFLICTS. Check happens in queue."
    server, cookies = auth_server
    rsp = req.post_start_merge(
        server.url, str(merge_request_user.id_persistent), cookies=cookies
    )
    assert rsp.status_code == 200
    merge_request = (
        ColumnMergeRequest.objects.by_id_persistent(  # pylint: disable=no-member
            merge_request_user.id_persistent
        )
    ).get()
    assert merge_request.state == ColumnMergeRequest.State.CONFLICTS
