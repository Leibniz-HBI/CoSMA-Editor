"Tests for changing entity merge requests from the API."

from requests import patch

import tests.merge_request.entity.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.entity.models_django import EntityMergeRequest
from tests.merge_request.entity.api.requests import patch_merge_request


def test_no_cookies(auth_server):
    "Make sure that the API returns 401 when no cookies are provided."
    rsp = patch(
        auth_server[0].url + "/cosmae/api/merge_requests/entities/some-id",
        json={"state": "CLOSED"},
        timeout=900,
    )
    assert rsp.status_code == 401


def test_unknown_user(request_commissioner, mocker):
    "Make sure that the API returns 401 when the user is not authenticated."
    mock = mocker.MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with mocker.patch("cosmae.merge_request.entity.api.check_user", mock):
        status, _ = patch_merge_request(request_commissioner, "some-id")
        assert status == 401


def test_insufficient_permissions(request_user):
    "Make sure that the API returns 403 when the user does not have sufficient permissions."
    status, _ = patch_merge_request(request_user, "some-id")
    assert status == 403


def test_can_close_merge_request(request_commissioner, merge_request_user):
    "Make sure that the API allows a commissioner to close a merge request."
    status, rsp = patch_merge_request(
        request_commissioner, merge_request_user.id_persistent
    )
    assert status == 200
    assert rsp.dict()["state"] == "CLOSED"
    mr_from_db = EntityMergeRequest.objects.get(
        id_persistent=c.id_merge_request_persistent
    )
    assert mr_from_db.state == EntityMergeRequest.State.CLOSED
