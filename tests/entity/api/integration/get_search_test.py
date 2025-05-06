# pylint: disable=missing-module-docstring, redefined-outer-name,invalid-name,unused-argument,duplicate-code
from unittest.mock import MagicMock, patch

import pytest

import tests.entity.api.integration.requests as req
import tests.entity.common as c
import tests.tag.common as ct
from tests.utils import assert_versioned
from cosmae.exception import NotAuthenticatedException
from cosmae.value.models_django import ValueHistory

_search_term = "tes ent"
_search_term_value = "al ear"
_instance_value = "value for entity search test"


def test_no_cookies(live_server):
    "Do not allow access to search without cookies."
    rsp = req.get_search(live_server.url, _search_term)
    assert rsp.status_code == 401


def test_authentication_error(auth_server):
    "Check that user is verified"
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.entity.api.check_user", mock):
        rsp = req.get_search(server.url, _search_term, cookies=cookies)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    "Check that applicants can not access search"
    server, cookies = auth_server_applicant
    rsp = req.get_search(server.url, _search_term, cookies=cookies)
    assert rsp.status_code == 403


def test_no_entity(auth_server):
    "Check results, when there are no entities"
    server, cookies = auth_server
    rsp = req.get_search(server.url, _search_term, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == {"search_result_list": []}


def test_single_entity(auth_server, entity1):
    "Check that a single entity is successfully returned."
    server, cookies = auth_server
    rsp = req.get_search(server.url, _search_term, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert_versioned(
        json,
        {
            "search_result_list": [
                {
                    "match_value": c.display_txt_test1,
                    "id_entity_persistent": c.id_persistent_test_1,
                    "id_tag_definition_persistent": None,
                }
            ]
        },
    )


@pytest.fixture()
def instance_search(user, column):
    "A value used for testing search"
    instance, _ = ValueHistory.change_or_create_versioned(
        ct.id_instance_test0,
        ct.time_edit_test,
        user.edit_session,
        id_entity_persistent=c.id_persistent_test_0,
        id_column_persistent=ct.id_column_persistent_test,
        value=_instance_value,
    )
    instance.save()
    return instance


def test_tag_value(auth_server, entity0, column, instance_search, display_txt_order_0):
    "Test search for tag values"
    server, cookies = auth_server
    # patch to make sure we get a tag result
    rsp = req.get_search(server.url, _search_term_value, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert_versioned(
        json,
        {
            "search_result_list": [
                {
                    "match_value": _instance_value,
                    "id_entity_persistent": c.id_persistent_test_0,
                    "id_tag_definition_persistent": ct.id_column_persistent_test,
                },
            ]
        },
    )
