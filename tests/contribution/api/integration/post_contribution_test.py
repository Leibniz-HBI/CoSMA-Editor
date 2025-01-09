# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.db import DatabaseError

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
from cosmae.contribution.models_django import ContributionCandidate

# The following will only test for errors, as success is tested in other integration tests.


def test_write_file_error(auth_server):
    mock = MagicMock()
    mock.side_effect = IOError()
    with patch("cosmae.contribution.api.open", mock):
        live_server, cookies = auth_server
        rsp = req_contrib.post_contribution(
            live_server.url, c.contribution_post0, cookies=cookies
        )
        assert rsp.status_code == 500
        assert rsp.json() == {"msg": "Could not save the uploaded file."}


def test_write_db_error(auth_server):
    inner_mock = MagicMock()
    inner_mock.save.side_effect = DatabaseError()
    inner_mock.id_persistent = str(uuid4())
    mock = MagicMock()
    mock.return_value = inner_mock
    with patch("cosmae.contribution.api.mk_initial_contribution_candidate", mock):
        live_server, cookies = auth_server
        rsp = req_contrib.post_contribution(
            live_server.url, c.contribution_post0, cookies=cookies
        )
        assert rsp.status_code == 500
        assert rsp.json() == {
            "msg": "Could not store the contribution in the database."
        }


def test_wrong_content_type(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url,
        c.contribution_post0,
        cookies=cookies,
        content_type="text/unknown",
    )
    assert rsp.status_code == 400
    assert rsp.json() == {
        "msg": "Invalid content type. Only text/csv, text/plain, text/x-csv, application/vnd.ms-excel, application/csv, application/x-csv, text/csv, text/comma-separated-values, text/x-comma-separated-values, text/tab-separated-values allowed."  # pylint: disable=line-too-long
    }


def test_unknown_edit_session(auth_server):
    live_server, cookies = auth_server
    payload = c.contribution_post0.copy()
    payload["id_edit_session_persistent"] = "zzzzz"
    rsp = req_contrib.post_contribution(
        live_server.url,
        payload,
        cookies=cookies,
        content_type="text/csv",
    )
    assert rsp.status_code == 400
    assert rsp.json() == {"msg": "Unknown edit session."}


def test_success(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        live_server.url,
        c.contribution_post0,
        cookies=cookies,
        content_type="text/csv",
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    sessions = list(ContributionCandidate.objects.filter(id_persistent=id_persistent))
    assert len(sessions) == 1
