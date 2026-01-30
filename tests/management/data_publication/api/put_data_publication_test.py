# pylint: disable=unused-argument
"Test API endpoint for creating data publications."

from requests import put

import tests.management.data_publication.common as c
from tests.management.data_publication.api.requests import put_data_publication


def test_no_csrf(live_server):
    """Test that unauthenticated users cannot create a data publication."""
    response = put(
        f"{live_server.url}/cosmae/api/manage/data_publication",
        json={
            "name": "Test Publication",
            "start_time": "2024-01-01T00:00:00Z",
            "end_time": "2024-12-31T23:59:59Z",
        },
        timeout=900,
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "CSRF check Failed"}


def test_unauthenticated(live_server, mock_csrf):
    """Test that unauthenticated users cannot create a data publication."""
    response = put(
        f"{live_server.url}/cosmae/api/manage/data_publication",
        json={
            "name": "Test Publication",
            "start_time": "2024-01-01T00:00:00Z",
            "end_time": "2024-12-31T23:59:59Z",
        },
        timeout=900,
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_applicant(request_applicant):
    """Test that applicants cannot create a data publication."""
    status, response = put_data_publication(
        request_applicant,
        name=c.created_name,
        start_time=c.created_start_date,
        end_time=c.created_end_date,
    )
    assert status == 403
    assert response.msg == "Forbidden"


def test_put_data_publication(request_commissioner):
    """Test creating a data publication via the API."""
    status, response = put_data_publication(
        request_commissioner,
        name=c.created_name,
        start_time=c.created_start_date,
        end_time=c.created_end_date,
    )
    assert status == 200
    assert response.name == c.created_name
    assert response.start_time == c.created_start_date
    assert response.end_time == c.created_end_date
    assert len(response.id_persistent) == 36
    assert response.step == "Created"
    assert response.error is None
    assert response.error_details is None
    assert response.is_working is False
