# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument, no-member
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from pytest import fixture
from requests import patch as patch_request

import tests.contribution.api.common as c
import tests.contribution.api.requests as req_contrib
import tests.contribution.column.api.requests as req
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.contribution.column.models_django import ColumnContribution
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.util.auth import NotAuthenticatedException


@fixture
def candidate_id_with_extracted(contribution_user_columns_extracted):
    id_persistent_candidate = contribution_user_columns_extracted.id_persistent
    candidate = ContributionCandidate.objects.get(id_persistent=id_persistent_candidate)
    candidate.state = ContributionCandidate.COLUMNS_EXTRACTED
    candidate.save()
    definition = ColumnContribution.objects.create(
        name="column_test",
        id_persistent=uuid4(),
        index_in_file=9000,
        contribution_candidate=candidate,
    )
    return candidate.id_persistent, definition.id_persistent


def test_unknown_user(request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.column.api.check_user", mock):
        status, _ = req.patch_column(
            request_user,
            "id-contribution-test",
            "id-column-test",
            id_existing_persistent="id-existing",
        )
        assert status == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = patch_request(
        server.url + "/cosmae/api/contributions/" + "id_contribution/columns/id_column",
        json={"id_existing_persistent": "id-existing"},
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_404_candidate(request_user):
    status, rsp = req.patch_column(
        request_user,
        "19879c82-f431-41dc-83e8-9b1469dd6c61",  # some random id
        "id-column-test",
        id_existing_persistent="id-existing",
    )
    assert status == 404
    assert rsp.msg == "Contribution candidate does not exist."


def test_404_column(request_user, candidate_id_with_extracted):
    id_candidate_persistent, _ = candidate_id_with_extracted
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        "b1ed2be5-46d2-42ef-a8cf-fe0aaab2ba3e",  # some random id
        id_existing_persistent="id-existing",
    )
    assert status == 404
    assert rsp.msg == "Column does not exist."


def test_columns_not_extracted(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    candidate = ContributionCandidate.objects.get(id_persistent=id_candidate_persistent)
    candidate.state = ContributionCandidate.COLUMNS_ASSIGNED
    candidate.save()
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="display_txt",
    )
    assert status == 400
    assert (
        rsp.msg == "You can only change column assignments, when"
        ' the contribution state is "COLUMNS_EXTRACTED".'
    )


def test_patch_display_txt(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    status, _ = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="display_txt",
    )
    assert status == 200
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_column_list"] = []
    assert status == 200
    assert rsp.dict() == {
        "column_list": [
            {
                "name": "column_test",
                "discard": False,
                "id_existing_persistent": "display_txt",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    status, rsp = req_contrib.get_contribution(request_user, id_candidate_persistent)
    assert status == 200
    json = rsp.dict()
    assert json == expected_contribution


def test_patch_id_persistent(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="id_persistent",
    )
    assert status == 200
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_column_list"] = []
    assert status == 200
    assert rsp.dict() == {
        "column_list": [
            {
                "name": "column_test",
                "discard": False,
                "id_existing_persistent": "id_persistent",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    status, rsp = req_contrib.get_contribution(request_user, id_candidate_persistent)
    assert status == 200
    json = rsp.dict()
    assert json == expected_contribution


def test_patch_id_unknown_special_column(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="unknown",
    )
    assert status == 400
    assert rsp.dict()["msg"] == "Existing column does not exist."


def test_patch_id_existing(request_user, user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    new_id_existing = str(uuid4)
    ColumnHistory.objects.create(
        name="existing column test",
        type=Column.BOOL,
        id_persistent=new_id_existing,
        time_edit=datetime.now(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent=new_id_existing,
    )
    assert status == 200
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_column_list"] = []
    assert status == 200
    assert rsp.dict() == {
        "column_list": [
            {
                "name": "column_test",
                "discard": False,
                "id_existing_persistent": new_id_existing,
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    status, rsp = req_contrib.get_contribution(request_user, id_candidate_persistent)
    assert status == 200
    json = rsp.dict()
    assert json == expected_contribution


def test_patch_id_existing_display_txt(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="display_txt",
    )
    assert status == 200
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_column_list"] = []
    assert status == 200
    assert rsp.dict() == {
        "column_list": [
            {
                "name": "column_test",
                "discard": False,
                "id_existing_persistent": "display_txt",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    status, rsp = req_contrib.get_contribution(request_user, id_candidate_persistent)
    assert status == 200
    json = rsp.dict()
    assert json == expected_contribution


def test_patch_id_existing_justification(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="justification",
    )
    assert status == 200
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_column_list"] = []
    assert status == 200
    assert rsp.dict() == {
        "column_list": [
            {
                "name": "column_test",
                "discard": False,
                "id_existing_persistent": "justification",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    status, rsp = req_contrib.get_contribution(request_user, id_candidate_persistent)
    assert status == 200
    json = rsp.dict()
    assert json == expected_contribution


def test_patch_discard(request_user, candidate_id_with_extracted):
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        id_existing_persistent="justification",
    )
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    assert rsp.column_list[0].id_existing_persistent == "justification"
    assert not rsp.column_list[0].discard
    status, rsp = req.patch_column(
        request_user,
        id_candidate_persistent,
        id_definition_persistent,
        discard=True,
    )
    assert status == 200
    status, rsp = req.get_column(request_user, id_candidate_persistent)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_column_list"] = []
    assert status == 200
    assert rsp.dict() == {
        "column_list": [
            {
                "name": "column_test",
                "discard": True,
                "id_existing_persistent": None,
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    status, rsp = req_contrib.get_contribution(request_user, id_candidate_persistent)
    assert status == 200
    json = rsp.dict()
    assert json == expected_contribution
