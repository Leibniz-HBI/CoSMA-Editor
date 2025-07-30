# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements

from datetime import timedelta
from unittest.mock import MagicMock, patch

import tests.column.api.integration.requests as r
import tests.column.common as c
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Make sure that an unauthenticated user gets the correct status code."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.column.api.check_user", mock):
        rsp = r.get_descendants(
            server.url, c.id_column_persistent_test_user, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server, column_user):
    "Make sure that without cookies the response has a unauthenticated status."
    server, _ = auth_server
    rsp = r.get_descendants(server.url, c.id_column_persistent_test_user)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant, column_user):
    "Make sure applicant can not purge."
    server, cookies = auth_server_applicant
    rsp = r.get_descendants(
        server.url, c.id_column_persistent_test_user, cookies=cookies
    )
    assert rsp.status_code == 403


def test_get_descendants_history(
    auth_server,
    column_parent,
    column_child_0,
    column_child_1,
    column_child_parent,
    column_child_parent_child,
):
    "Make sure descendants are computed correctly."
    server, cookies = auth_server
    rsp = r.get_descendants(
        server.url,
        c.id_column_parent_persistent_test,
        up_until_time=c.time_edit_test + timedelta(seconds=15),
        cookies=cookies,
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "id_descendants_persistent_list": [
            column_child_0.id_persistent,
            column_child_1.id_persistent,
        ]
    }

    # make sure without history works
    rsp = r.get_descendants(
        server.url, c.id_column_parent_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {
        "id_descendants_persistent_list": [
            column_child_1.id_persistent,
            column_child_0.id_persistent,
            column_child_parent_child.id_persistent,
        ]
    }
