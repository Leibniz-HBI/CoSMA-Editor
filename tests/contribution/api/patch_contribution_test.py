# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from unittest.mock import MagicMock, patch
from uuid import uuid4

from requests import patch as patch_req

import tests.contribution.api.common as c
import tests.contribution.api.requests as req_contrib
import tests.edit_session.common as cs
import tests.user.common as cu
from cosmae.contribution.models_api import ContributionCandidatePatchRequest
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.util.auth import NotAuthenticatedException


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = patch_req(
        live_server.url + "/cosmae/api/contributions/id-test",
        json={"name": "new name"},
        timeout=900,
    )
    assert rsp.status_code == 401


def test_invalid_user(request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        status, _rsp = req_contrib.patch_contribution(
            request_user, "id-test", ContributionCandidatePatchRequest(name="name")
        )
        assert status == 401


def test_404(request_user):
    status, _rsp = req_contrib.patch_contribution(
        request_user, str(uuid4()), ContributionCandidatePatchRequest(name="new name")
    )
    assert status == 404


def test_wrong_user(request_user, request_user1):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, _rsp = req_contrib.patch_contribution(
        request_user1, id_persistent, ContributionCandidatePatchRequest(name="new name")
    )
    assert status == 404


def test_patch_name(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, _rsp = req_contrib.patch_contribution(
        request_user, id_persistent, ContributionCandidatePatchRequest(name="new name")
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == "new name"
    assert contribution["description"] == c.contribution_post0.description
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]
    assert contribution["empty_values"] == cu.test_empty_values
    assert contribution["id_edit_session_persistent"] == cs.id_session_user
    assert not contribution["mark_delete"]


def test_patch_description(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user,
        id_persistent,
        ContributionCandidatePatchRequest(description="new description"),
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == c.contribution_post0.name
    assert contribution["description"] == "new description"
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]
    assert contribution["empty_values"] == cu.test_empty_values
    assert contribution["id_edit_session_persistent"] == cs.id_session_user
    assert not contribution["mark_delete"]


def test_patch_header_flag(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, _rsp = req_contrib.patch_contribution(
        request_user, id_persistent, ContributionCandidatePatchRequest(has_header=True)
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == c.contribution_post0.name
    assert contribution["description"] == c.contribution_post0.description
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["has_header"]
    assert contribution["empty_values"] == cu.test_empty_values
    assert contribution["id_edit_session_persistent"] == cs.id_session_user
    assert not contribution["mark_delete"]


def test_patch_empty_values(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user,
        id_persistent,
        ContributionCandidatePatchRequest(empty_values="empty,absent"),
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == c.contribution_post0.name
    assert contribution["description"] == c.contribution_post0.description
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["empty_values"] == "empty,absent"
    assert not contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user
    assert not contribution["mark_delete"]


def test_patch_mark_delete(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user,
        id_persistent,
        ContributionCandidatePatchRequest(mark_delete=True),
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 404
    contribution = ContributionCandidate.objects.filter(
        id_persistent=id_persistent
    ).get()  # pylint: disable=no-member
    assert contribution.name == c.contribution_post0.name
    assert contribution.description == c.contribution_post0.description
    assert contribution.state == "UPLD"
    assert contribution.created_by.username == cu.test_username
    assert contribution.empty_values == "null,nan,na"
    assert not contribution.has_header
    assert contribution.edit_session_id == cs.id_session_user
    assert contribution.mark_delete


def test_patch_edit_session(request_user, other_session):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user,
        id_persistent,
        ContributionCandidatePatchRequest(
            id_edit_session_persistent=other_session.id_persistent
        ),
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == c.contribution_post0.name
    assert contribution["description"] == c.contribution_post0.description
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["empty_values"] == "null,nan,na"
    assert not contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user_changed
    assert not contribution["mark_delete"]


def test_patch_unknown_edit_session(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user,
        id_persistent,
        ContributionCandidatePatchRequest(id_edit_session_persistent="zzzz"),
    )
    assert status == 400
    assert rsp.dict() == {"msg": "Unknown edit session."}


def test_patch_all(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user,
        id_persistent,
        ContributionCandidatePatchRequest(
            name="new name",
            description="new description",
            has_header=True,
            empty_values="empty,absent",
        ),
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == "new name"
    assert contribution["description"] == "new description"
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert contribution["empty_values"] == "empty,absent"
    assert contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user


def test_unknown_field(request_user):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, rsp = req_contrib.patch_contribution(
        request_user, id_persistent, ContributionCandidatePatchRequest(foo="bar")
    )
    assert status == 200
    status, rsp = req_contrib.get_contribution(request_user, id_persistent)
    assert status == 200
    contribution = rsp.dict()
    assert contribution["name"] == c.contribution_post0.name
    assert contribution["description"] == c.contribution_post0.description
    assert contribution["state"] == "UPLOADED"
    assert contribution["author"] == cu.test_username
    assert not contribution["has_header"]
    assert contribution["id_edit_session_persistent"] == cs.id_session_user
    assert not contribution["mark_delete"]
