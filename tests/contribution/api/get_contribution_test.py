# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from unittest.mock import MagicMock, patch
from uuid import uuid4

from requests import get

import tests.contribution.api.common as c
import tests.contribution.api.requests as req_contrib
import tests.edit_session.common as cs
import tests.user.common as cu
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.util.auth import NotAuthenticatedException


def test_unknown_user(request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        status, _rsp = req_contrib.get_contribution(request_user, "id-test")
        assert status == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = get(server.url + "/cosmae/api/contributions/id-test", timeout=900)
    assert rsp.status_code == 401


def test_404(request_user):
    status, _rsp = req_contrib.get_contribution(request_user, str(uuid4()))
    assert status == 404


def test_get(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.get_contribution(
        request_user, id_persistent=id_persistent
    )
    assert status == 200
    contribution = rsp.dict()
    assert contribution["id_persistent"] == id_persistent
    contribution.pop("id_persistent")
    assert contribution["match_column_list"] == []
    contribution.pop("match_column_list")
    assert contribution == c.contribution_test_upload0


def test_get_with_match_column_list(request_user, column1, column_curated):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_merge_request_persistent,
        id_origin_persistent=column1.id_persistent,
        id_destination_persistent=column_curated.id_persistent,
        contribution_candidate_id=id_persistent,
        state=ColumnMergeRequest.State.OPEN,
        created_by=column1.owner,
        created_at=c.time_edit_column_merge_request,
    )
    status, rsp = req_contrib.get_contribution(
        request_user, id_persistent=id_persistent
    )
    assert status == 200
    contribution = rsp.dict()
    assert contribution["id_persistent"] == id_persistent
    contribution.pop("id_persistent")
    assert contribution["match_column_list"] == [
        {
            "id_persistent": column_curated.id_persistent,
            "name": column_curated.name,
            "curated": column_curated.curated,
            "description": None,
            "id_parent_persistent": column_curated.id_parent_persistent,
            "version": column_curated.id,
            "name_path": [column_curated.name],
            "type": "STRING",
            "hidden": column_curated.hidden,
            "disabled": column_curated.disabled,
            "owner": None,
        }
    ]
    contribution.pop("match_column_list")
    assert contribution == c.contribution_test_upload0


def test_get_with_error(request_user, contribution_error):
    status, rsp = req_contrib.get_contribution(
        request_user, id_persistent=contribution_error.id_persistent
    )
    assert status == 200
    json = rsp.dict()
    assert json == {
        "id_persistent": contribution_error.id_persistent,
        "name": contribution_error.name,
        "description": contribution_error.description,
        "has_header": False,
        "author": cu.test_username,
        "state": "ENTITIES_MATCHED",
        "error_msg": contribution_error.error_msg,
        "error_details": contribution_error.error_trace,
        "match_column_list": [],
        "empty_values": "null,nan,na",
        "justification_txt": None,
        "id_edit_session_persistent": cs.id_session_user,
        "mark_delete": False,
    }
