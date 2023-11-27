# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.merge_request.api.integration.requests as req
import tests.merge_request.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagInstance
from cosmae.util import timestamp


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
        "msg": "You do not have write permissions for the destination tag."
    }


def test_resolved_conflict(
    auth_server,
    merge_request_user,
    conflict_resolution_replace,
    conflict_resolution_keep,
):
    server, cookies = auth_server
    rsp = req.post_start_merge(
        server.url, str(merge_request_user.id_persistent), cookies=cookies
    )
    assert rsp.status_code == 200
    merge_request = (
        TagMergeRequest.by_id_persistent_query_set(  # pylint: disable=no-member
            merge_request_user.id_persistent
        )
    ).get()
    assert merge_request.state == TagMergeRequest.RESOLVED


def test_open_conflicts(
    auth_server, merge_request_user, instances_merge_request_origin_user
):
    server, cookies = auth_server
    rsp = req.post_start_merge(
        server.url, str(merge_request_user.id_persistent), cookies=cookies
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "msg": "There are unresolved conflicts for the merge request."
    }


def test_updated_data(
    auth_server,
    merge_request_user,
    conflict_resolution_replace,
    conflict_resolution_keep,
):
    server, cookies = auth_server
    old_instance = conflict_resolution_replace.tag_instance_destination
    instance, _ = TagInstance.change_or_create(
        id_persistent=old_instance.id_persistent,
        id_entity_persistent=old_instance.id_entity_persistent,
        id_tag_definition_persistent=old_instance.id_tag_definition_persistent,
        version=old_instance.id,
        user=merge_request_user.assigned_to,
        time_edit=timestamp(),
        value="updated value test",
    )
    instance.save()
    rsp = req.post_start_merge(
        server.url, str(merge_request_user.id_persistent), cookies=cookies
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "msg": "There are conflicts for the merge request, where the underlying data has changed."
    }
