"Tests for getting data publication results via the API."

from json import loads

from requests import get

from tests.management.data_publication.api.requests import (
    get_data_publication_results,
)


def test_no_cookies(live_server):
    "Test getting data publication results without cookies."
    rsp = get(
        f"{live_server.url}/cosmae/api/manage/data_publication/some-id/results",
        timeout=900,
    )
    assert rsp.status_code == 401


def test_insufficient_permissions(request_user):
    "Test getting data publication results with insufficient permissions."
    status, response = get_data_publication_results(
        request_user,
        "some-id",
    )
    assert status == 403
    assert response.msg == "Forbidden"


def test_missing_publication(request_commissioner):
    "Test getting data publication results for a missing publication."
    status, response = get_data_publication_results(
        request_commissioner, "nonexistent-publication-id"
    )
    assert status == 404
    assert response.msg == "Results for dataset publication not found."


def test_unfinished_publication(request_commissioner, publication_display_txt_working):
    "Test getting data publication results for an unfinished publication."
    status, response = get_data_publication_results(
        request_commissioner, publication_display_txt_working.id_persistent
    )
    assert status == 404
    assert response.msg == "Results for dataset publication not found."


def test_success(request_commissioner, publication_completed_input):
    "Test getting data publication results successfully."
    response = get_data_publication_results(
        request_commissioner,
        publication_completed_input.publication.id_persistent,
    )
    assert response.status_code == 200
    json = loads(response.content)
    assert json == {
        "column_curated": [],
        "column_user": [],
        "display_txt": [],
        "overall": [],
        "justification": [],
    }
