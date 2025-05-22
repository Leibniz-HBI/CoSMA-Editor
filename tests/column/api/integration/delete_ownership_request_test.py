# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.column.api.integration.requests as req
import tests.column.common as c
from cosmae.column.models_django import OwnershipRequest
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Make sure that an unauthenticated user gets the correct status code."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.column.api_permissions.check_user", mock):
        rsp = req.delete_ownership(server.url, c.id_ownership_request_test, cookies)
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Make sure that without cookies the response has a unauthenticated status."
    server, _ = auth_server
    rsp = req.delete_ownership(server.url, c.id_ownership_request_test)
    assert rsp.status_code == 401


def test_wrong_user(auth_server1, ownership_request_user):
    "Make sure the wrong user can not delete an ownership request."
    server, _, cookies = auth_server1
    rsp = req.delete_ownership(server.url, c.id_ownership_request_test, cookies=cookies)
    assert rsp.status_code == 403


def test_correct_user(auth_server, ownership_request_user):
    "Make sure the petitioner can delete an ownership request."
    server, cookies = auth_server
    rsp = req.delete_ownership(server.url, c.id_ownership_request_test, cookies=cookies)
    assert rsp.status_code == 200
    ownership_requests = OwnershipRequest.objects.all()  # pylint: disable=no-member
    assert 0 == len(ownership_requests)


def test_commissioner_curated(
    auth_server_commissioner, ownership_request_curated_editor
):
    "Make sure a commissioner can delete ownership requests for curated columns."
    server, cookies = auth_server_commissioner
    rsp = req.delete_ownership(
        server.url, c.id_ownership_request_curated_test, cookies=cookies
    )
    assert rsp.status_code == 200
    ownership_requests = OwnershipRequest.objects.all()  # pylint: disable=no-member
    assert 0 == len(ownership_requests)
