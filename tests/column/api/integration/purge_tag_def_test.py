# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.column.api.integration.requests as r
import tests.column.common as c
from cosmae.column.models_django import ColumnHistory
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Make sure that an unauthenticated user gets the correct status code."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.column.api.check_user", mock):
        rsp = r.purge_column(
            server.url, c.id_column_persistent_test_user, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server, column_user):
    "Make sure that without cookies the response has a unauthenticated status."
    server, _ = auth_server
    rsp = r.purge_column(server.url, c.id_column_persistent_test_user)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant, column_user):
    "Make sure applicant can not purge."
    server, cookies = auth_server_applicant
    rsp = r.purge_column(server.url, c.id_column_persistent_test_user, cookies=cookies)
    assert rsp.status_code == 403


def test_no_permission(auth_server1, column_user):
    "Make sure no other user can purge."
    server, _cookies, cookies = auth_server1
    rsp = r.purge_column(server.url, c.id_column_persistent_test_user, cookies=cookies)
    assert rsp.status_code == 403


def test_bypasses_children(auth_server, column_parent, column_child_0, column_child_1):
    "Make sure children are attached to the parent of the purged column."
    server, cookies = auth_server
    rsp = r.purge_column(
        server.url, c.id_column_parent_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    assert (
        len(ColumnHistory.objects.filter(id_persistent=column_parent.id_persistent))
        == 0
    )
    for column in [column_child_0, column_child_1]:
        column_retrieved = ColumnHistory.objects.filter(
            id_persistent=column.id_persistent
        ).get()
        assert column_retrieved.id_parent_persistent is None
