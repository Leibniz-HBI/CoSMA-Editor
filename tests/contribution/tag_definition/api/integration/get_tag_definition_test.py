# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
import tests.contribution.tag_definition.api.integration.requests as req
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.util.auth import NotAuthenticatedException


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.contribution.tag_definition.api.check_user", mock):
        rsp = req.get_tag_definition(server.url, "id-test", cookies=cookies)
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.get_tag_definition(server.url, "id-test")
    assert rsp.status_code == 401


def test_404(auth_server):
    server, cookies = auth_server
    rsp = req.get_tag_definition(server.url, str(uuid4()), cookies=cookies)
    assert rsp.status_code == 404


def test_uploaded_400(auth_server):
    server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req.get_tag_definition(server.url, id_persistent, cookies)
    assert rsp.status_code == 400
    assert rsp.json() == {"msg": "Column definitions not yet extracted."}


def test_no_defs(auth_server):
    server, cookies = auth_server
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_post0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    candidate = ContributionCandidate.objects.get(  # pylint: disable=no-member
        id_persistent=id_persistent
    )
    candidate.state = ContributionCandidate.COLUMNS_EXTRACTED
    candidate.save()
    rsp = req.get_tag_definition(server.url, id_persistent, cookies)
    assert rsp.status_code == 404
    assert rsp.json() == {"msg": "No tag definitions match the given parameters."}


def test_get_tag_defs(auth_server, contribution_tag_def, contribution_tag_def_1):
    server, cookies = auth_server
    contribution_candidate = contribution_tag_def.contribution_candidate
    id_persistent = contribution_candidate.id_persistent
    rsp = req.get_tag_definition(server.url, id_persistent, cookies)
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [c.tag_def_test1, c.tag_def_test0],
    }
