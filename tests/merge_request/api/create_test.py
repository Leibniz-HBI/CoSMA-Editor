"Test API methods for creating new merge requests."

from requests import put

import tests.user.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnMergeRequest
from tests.merge_request.api.requests import create_merge_request


def test_no_cookies(live_server):
    "Test that creating a merge request without cookies fails."
    response = put(
        live_server.url + "/cosmae/api/merge_requests/new/id-origin/id-destination",
        cookies=None,
        timeout=900,
    )
    assert response.status_code == 403


def test_unknown_user(request_commissioner, mocker):
    "Test that creating a merge request with an unknown user fails."
    mock = mocker.MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with mocker.patch("cosmae.merge_request.api.check_user", mock):
        response = create_merge_request(
            request_commissioner, "id-origin", "id-destination"
        )
    assert response[0] == 401


def test_no_origin_column(request_user, column_user):
    "Test that creating a merge request with a non-existing origin column fails."
    response = create_merge_request(
        request_user, "non-existing-origin", column_user.id_persistent
    )
    assert response[0] == 404


def test_no_destination_column(request_user, column_user):
    "Test that creating a merge request with a non-existing destination column fails."
    response = create_merge_request(
        request_user, column_user.id_persistent, "non-existing-destination"
    )
    assert response[0] == 404


def test_no_permissions(request_user, column_curated, column_curated1):
    "Test that creating a merge request without permissions fails."
    response = create_merge_request(
        request_user, column_curated.id_persistent, column_curated1.id_persistent
    )
    assert response[0] == 403


def test_create_origin_owner(request_user, column_user, column_curated):
    "Test that creating a merge request with valid parameters succeeds."
    response = create_merge_request(
        request_user, column_user.id_persistent, column_curated.id_persistent
    )
    assert response[0] == 200
    mr = ColumnMergeRequest.objects.all().get()
    assert mr.id_origin_persistent == column_user.id_persistent
    assert mr.id_destination_persistent == column_curated.id_persistent
    assert mr.created_by.id_persistent == c.test_uuid
    assert mr.assigned_to is None


def test_create_destination_owner(request_user, column_curated, column_user):
    "Test that creating a merge request with valid parameters succeeds."
    response = create_merge_request(
        request_user, column_curated.id_persistent, column_user.id_persistent
    )
    assert response[0] == 200
    mr = ColumnMergeRequest.objects.all().get()
    assert mr.id_origin_persistent == column_curated.id_persistent
    assert mr.id_destination_persistent == column_user.id_persistent
    assert mr.created_by.id_persistent == c.test_uuid
    assert mr.assigned_to.id_persistent == c.test_uuid
