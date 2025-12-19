# pylint: disable=unused-argument
"Test API endpoint for retrieving data publications."

from requests import get

import tests.management.data_publication.common as c
from tests.management.data_publication.api.requests import get_data_publication_list


def test_unauthenticated(live_server):
    """Test that unauthenticated users cannot create a data publication."""
    response = get(
        f"{live_server.url}/cosmae/api/manage/data_publication",
        timeout=900,
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_applicant(request_applicant):
    """Test that applicants cannot create a data publication."""
    status, response = get_data_publication_list(
        request_applicant,
    )
    assert status == 403
    assert response.msg == "Forbidden"


def test_get_data_publication(
    request_commissioner, publication_created, publication_working
):
    """Test creating a data publication via the API."""
    status, response = get_data_publication_list(
        request_commissioner,
    )
    assert status == 200
    rsp_dict = response.dict()
    assert list(rsp_dict.keys()) == ["metadata_list"]
    result_list = rsp_dict["metadata_list"]
    sorted_result_list = sorted(result_list, key=lambda x: x["id_persistent"])
    assert sorted_result_list == [
        {
            "name": c.created_name,
            "start_time": c.created_start_date,
            "end_time": c.created_end_date,
            "id_persistent": c.created_id_persistent,
            "step": "Created",
            "error": None,
            "error_details": None,
            "is_working": False,
        },
        {
            "name": c.working_name,
            "start_time": c.working_start_date,
            "end_time": c.working_end_date,
            "id_persistent": c.working_id_persistent,
            "step": "Created",
            "error": None,
            "error_details": None,
            "is_working": True,
        },
    ]
