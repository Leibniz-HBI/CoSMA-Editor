# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.db import DatabaseError
from requests import post

import tests.contribution.api.common as c
import tests.contribution.api.requests as req_contrib
from cosmae.contribution.models_django import ContributionCandidate

# The following will only test for errors, as success is tested in other integration tests.


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = post(
        live_server.url + "/cosmae/api/contributions",
        data=c.contribution_post0.dict(),
        files={
            "file": (
                "empty.csv",
                open(  # pylint: disable=consider-using-with
                    "tests/files/empty.csv", "rb"
                ),
                "text/csv",
            )
        },
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_write_file_error(request_user):
    mock = MagicMock()
    mock.side_effect = IOError()
    with patch("cosmae.contribution.api.open", mock):
        status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
        assert status == 500
        assert rsp.dict() == {"msg": "Could not save the uploaded file."}


def test_write_db_error(request_user):
    inner_mock = MagicMock()
    inner_mock.save.side_effect = DatabaseError()
    inner_mock.id_persistent = str(uuid4())
    mock = MagicMock()
    mock.return_value = inner_mock
    with patch("cosmae.contribution.api.mk_initial_contribution_candidate", mock):
        status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
        assert status == 500
        assert rsp.dict() == {
            "msg": "Could not store the contribution in the database."
        }


def test_wrong_content_type(request_user):
    status, rsp = req_contrib.post_contribution(
        request_user,
        c.contribution_post0,
        content_type="text/unknown",
    )
    assert status == 400
    assert rsp.dict() == {
        "msg": "Invalid content type. Only text/csv, text/plain, text/x-csv, application/vnd.ms-excel, application/csv, application/x-csv, text/csv, text/comma-separated-values, text/x-comma-separated-values, text/tab-separated-values allowed."  # pylint: disable=line-too-long
    }


def test_unknown_edit_session(request_user):
    payload = c.contribution_post0.model_copy(
        update={"id_edit_session_persistent": "zzzzz"}
    )
    status, rsp = req_contrib.post_contribution(
        request_user,
        payload,
        content_type="text/csv",
    )
    assert status == 400
    assert rsp.dict() == {"msg": "Unknown edit session."}


def test_success(request_user):
    status, rsp = req_contrib.post_contribution(
        request_user,
        c.contribution_post0,
        content_type="text/csv",
    )
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    sessions = list(
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )
    )
    assert len(sessions) == 1
