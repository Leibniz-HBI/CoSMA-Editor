# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.tag.api.integration.requests as req
import tests.tag.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import OwnershipRequest as OwnershipRequestDb
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb


def test_unknown_user(auth_server):
    "Test the response when the user is not authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.tag.api.permissions.check_user", mock):
        rsp = req.post_curation(
            server.url, c.id_tag_def_persistent_test, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Check 401 response for missing cookies."
    server, _ = auth_server
    rsp = req.post_curation(server.url, c.id_tag_def_persistent_test)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server):
    "Check correct status code for normal users."
    server, cookies = auth_server
    rsp = req.post_curation(server.url, c.id_tag_def_persistent_test, cookies=cookies)
    assert rsp.status_code == 403


def test_not_existing(auth_server_commissioner):
    "Check correct status for non existing tag def."
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(server.url, c.id_tag_def_persistent_test, cookies=cookies)
    assert rsp.status_code == 404


def test_curate(auth_server_commissioner, tag_def_user):
    "Check whether a commissioner can curate a tag."
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(server.url, tag_def_user.id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    tag_def = TagDefinitionDb.most_recent_by_id(tag_def_user.id_persistent)
    assert tag_def.curated
    assert tag_def.owner is None


def test_curate_removes_ownership_requests(
    auth_server_commissioner, ownership_request_user
):
    "Check whether a commissioner can curate a tag."
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(
        server.url, ownership_request_user.id_tag_definition_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    tag_def = TagDefinitionDb.most_recent_by_id(
        ownership_request_user.id_tag_definition_persistent
    )
    assert tag_def.curated
    assert tag_def.owner is None
    assert 0 == len(
        OwnershipRequestDb.by_id_tag_definition_persistent_query_set(
            ownership_request_user.id_tag_definition_persistent
        )
    )


def test_curate_changes_mrs(auth_server_commissioner, tag_def_user, user_editor):
    "Check whether a commissioner can curate a tag."
    id_mr_persistent = "83cea683-d504-495f-b9dc-d14b025267a2"
    TagMergeRequest.objects.create(  # pylint: disable=no-member
        assigned_to=tag_def_user.owner,
        created_by=user_editor,
        state=TagMergeRequest.OPEN,
        id_origin_persistent="origin_for_test",
        id_destination_persistent=tag_def_user.id_persistent,
        created_at=c.time_edit_test,
        id_persistent=id_mr_persistent,
    )
    server, cookies = auth_server_commissioner
    rsp = req.post_curation(server.url, tag_def_user.id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    assert (
        TagMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=id_mr_persistent
        )
        .get()
        .assigned_to
        is None
    )
