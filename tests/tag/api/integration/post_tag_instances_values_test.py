# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

import tests.tag.common as c
from tests.person.api.integration.requests import post_person
from tests.tag.api.integration.requests import (
    post_tag_def,
    post_tag_instance,
    post_tag_instance_values,
    post_tag_instances,
)

id_value_test = "id-value-test"
id_value_test1 = "id-value-test1"
id_value_test2 = "id-value-test2"


def test_empty_db(auth_server):
    live_server, cookies = auth_server
    rsp = post_tag_instance_values(
        live_server.url, c.id_entity_test, c.id_tag_def_persistent_test, cookies=cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": c.id_entity_test,
                "id_tag_definition_persistent": c.id_tag_def_persistent_test,
                "values": [],
            }
        ]
    }


def test_gets_most_recent(auth_server, person, child_tag_def):
    live_server, cookies = auth_server
    rsp = post_person(live_server.url, person, cookies=cookies)
    assert rsp.status_code == 200
    id_entity = rsp.json()["persons"][0]["id_persistent"]
    rsp = post_tag_def(live_server.url, child_tag_def, cookies=cookies)
    id_tag_def = rsp.json()["tag_definitions"][0]["id_persistent"]
    assert rsp.status_code == 200
    rsp = post_tag_instance(
        live_server.url,
        {
            "id_entity_persistent": id_entity,
            "id_tag_definition_persistent": id_tag_def,
            "value": 1,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_instance = rsp.json()["tag_instances"][0]
    version = rsp_instance["version"]
    id_instance = rsp_instance["id_persistent"]
    rsp = post_tag_instance(
        live_server.url,
        {
            "id_entity_persistent": id_entity,
            "id_tag_definition_persistent": id_tag_def,
            "value": 2,
            "version": version,
            "id_persistent": id_instance,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_instance = rsp.json()["tag_instances"][0]
    version = rsp_instance["version"]
    rsp = post_tag_instance_values(
        live_server.url, id_entity, id_tag_def, cookies=cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": id_entity,
                "id_tag_definition_persistent": id_tag_def,
                "values": [
                    {
                        "id_persistent": id_instance,
                        "id_entity_persistent": id_entity,
                        "id_tag_definition_persistent": id_tag_def,
                        "value": "2",
                        "version": rsp_instance["version"],
                    }
                ],
            }
        ]
    }


def test_gets_most_recent_multi_value(auth_server, person, child_tag_def):
    live_server, cookies = auth_server
    rsp = post_person(live_server.url, person, cookies=cookies)
    assert rsp.status_code == 200
    id_entity = rsp.json()["persons"][0]["id_persistent"]
    rsp = post_tag_def(live_server.url, child_tag_def, cookies=cookies)
    id_tag_def = rsp.json()["tag_definitions"][0]["id_persistent"]
    assert rsp.status_code == 200
    rsp = post_tag_instances(
        live_server.url,
        [
            {
                "id_entity_persistent": id_entity,
                "id_tag_definition_persistent": id_tag_def,
                "value": 1,
            },
            {
                "id_entity_persistent": id_entity,
                "id_tag_definition_persistent": id_tag_def,
                "value": 5,
            },
        ],
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_json = rsp.json()
    rsp_instance0 = rsp_json["tag_instances"][0]
    rsp_instance1 = rsp.json()["tag_instances"][1]
    version = rsp_instance0["version"]
    id_instance = rsp_instance0["id_persistent"]
    rsp = post_tag_instance(
        live_server.url,
        {
            "id_entity_persistent": id_entity,
            "id_tag_definition_persistent": id_tag_def,
            "value": 2,
            "version": version,
            "id_persistent": id_instance,
        },
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp_instance0 = rsp.json()["tag_instances"][0]
    rsp = post_tag_instance_values(
        live_server.url, id_entity, id_tag_def, cookies=cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "value_responses": [
            {
                "id_entity_persistent": id_entity,
                "id_tag_definition_persistent": id_tag_def,
                "values": [
                    {
                        "id_persistent": rsp_instance1["id_persistent"],
                        "id_entity_persistent": id_entity,
                        "id_tag_definition_persistent": id_tag_def,
                        "value": "5",
                        "version": rsp_instance1["version"],
                    },
                    {
                        "id_persistent": id_instance,
                        "id_entity_persistent": id_entity,
                        "id_tag_definition_persistent": id_tag_def,
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
        "cosmae.tag.models_django.TagInstance.most_recents_by_entity_and_definition_ids",
        mock,
    ):
        req = post_tag_instance_values(
            live_server.url,
            c.id_entity_test,
            c.id_tag_def_persistent_test,
            cookies=cookies,
        )
    assert req.status_code == 500
    assert req.json()["msg"] == "Could not get requested values."


def test_not_logged_in(live_server):
    req = post_tag_instance_values(
        live_server.url,
        c.id_entity_test,
        c.id_tag_def_persistent_test,
    )
    assert req.status_code == 401
