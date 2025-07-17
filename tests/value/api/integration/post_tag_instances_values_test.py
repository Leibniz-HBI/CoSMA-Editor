# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from datetime import timedelta
from time import sleep
from unittest.mock import MagicMock, patch

import tests.column.common as cc
import tests.value.common as c
from tests.column.api.integration.requests import (
    post_column,
)
from tests.entity.api.integration.requests import post_person
from tests.value.api.integration.requests import (
    post_value,
    post_value_list,
    post_value_value,
)
from cosmae.util import timestamp

id_value_test = "id-value-test"
id_value_test1 = "id-value-test1"
id_value_test2 = "id-value-test2"


def test_empty_db(auth_server):
    live_server, cookies = auth_server
    rsp = post_value_value(
        live_server.url, c.id_entity_test, cc.id_column_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": c.id_entity_test,
                "id_column_persistent": cc.id_column_persistent_test,
                "values": [],
            }
        ]
    }


def test_gets_most_recent_and_history(auth_server_commissioner, person, child_column):
    live_server, cookies = auth_server_commissioner
    rsp = post_person(live_server.url, person, cookies=cookies)
    assert rsp.status_code == 200
    id_entity = rsp.json()["entity_list"][0]["id_persistent"]
    rsp = post_column(live_server.url, child_column, cookies=cookies)
    id_column = rsp.json()["column_list"][0]["id_persistent"]
    assert rsp.status_code == 200
    rsp = post_value(
        live_server.url,
        {
            "id_entity_persistent": id_entity,
            "id_column_persistent": id_column,
            "value": "1",
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_instance = rsp.json()["value_list"][0]
    version_before_change = rsp_instance["version"]
    id_instance = rsp_instance["id_persistent"]
    time_before_change = timestamp() + timedelta(seconds=1)
    sleep(2)
    rsp = post_value(
        live_server.url,
        {
            "id_entity_persistent": id_entity,
            "id_column_persistent": id_column,
            "value": "2",
            "version": version_before_change,
            "id_persistent": id_instance,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_instance = rsp.json()["value_list"][0]
    version = rsp_instance["version"]
    rsp = post_value_value(live_server.url, id_entity, id_column, cookies=cookies)
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": id_entity,
                "id_column_persistent": id_column,
                "values": [
                    {
                        "id_persistent": id_instance,
                        "id_entity_persistent": id_entity,
                        "id_column_persistent": id_column,
                        "value": "2",
                        "version": version,
                    }
                ],
            }
        ]
    }
    # now check for_history
    rsp = post_value_value(
        live_server.url, id_entity, id_column, time_before_change, cookies=cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": id_entity,
                "id_column_persistent": id_column,
                "values": [
                    {
                        "id_persistent": id_instance,
                        "id_entity_persistent": id_entity,
                        "id_column_persistent": id_column,
                        "value": "1",
                        "version": version_before_change,
                    }
                ],
            }
        ]
    }


def test_gets_most_recent_multi_value(auth_server_commissioner, person, child_column):
    live_server, cookies = auth_server_commissioner
    rsp = post_person(live_server.url, person, cookies=cookies)
    assert rsp.status_code == 200
    id_entity = rsp.json()["entity_list"][0]["id_persistent"]
    rsp = post_column(live_server.url, child_column, cookies=cookies)
    id_column = rsp.json()["column_list"][0]["id_persistent"]
    assert rsp.status_code == 200
    rsp = post_value_list(
        live_server.url,
        [
            {
                "id_entity_persistent": id_entity,
                "id_column_persistent": id_column,
                "value": "1",
            },
            {
                "id_entity_persistent": id_entity,
                "id_column_persistent": id_column,
                "value": "5",
            },
        ],
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_json = rsp.json()
    rsp_instance0 = rsp_json["value_list"][0]
    rsp_instance1 = rsp.json()["value_list"][1]
    version = rsp_instance0["version"]
    id_instance = rsp_instance0["id_persistent"]
    rsp = post_value(
        live_server.url,
        {
            "id_entity_persistent": id_entity,
            "id_column_persistent": id_column,
            "value": "2",
            "version": version,
            "id_persistent": id_instance,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_instance0 = rsp.json()["value_list"][0]
    rsp = post_value_value(live_server.url, id_entity, id_column, cookies=cookies)
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": id_entity,
                "id_column_persistent": id_column,
                "values": [
                    {
                        "id_persistent": rsp_instance1["id_persistent"],
                        "id_entity_persistent": id_entity,
                        "id_column_persistent": id_column,
                        "value": "5",
                        "version": rsp_instance1["version"],
                    },
                    {
                        "id_persistent": id_instance,
                        "id_entity_persistent": id_entity,
                        "id_column_persistent": id_column,
                        "value": "2",
                        "version": rsp_instance0["version"],
                    },
                ],
            }
        ]
    }


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = Exception()
    with patch(
        "cosmae.value.models_django.ValueQuerySet.most_recent_by_entity_and_definition_id_query_set",
        mock,
    ):
        req = post_value_value(
            live_server.url,
            c.id_entity_test,
            cc.id_column_persistent_test,
            cookies=cookies,
        )
    assert req.status_code == 500
    assert req.json()["msg"] == "Could not get requested values."


def test_not_logged_in(live_server):
    req = post_value_value(
        live_server.url,
        c.id_entity_test,
        cc.id_column_persistent_test,
    )
    assert req.status_code == 401
