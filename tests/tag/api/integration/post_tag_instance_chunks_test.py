# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.tag.common as c
from tests.tag.api.integration.requests import (
    post_tag_instance_chunks,
    post_tag_instances,
)


def test_empty_chunk(auth_server, tag_def):
    live_server, cookies = auth_server
    rsp = post_tag_instance_chunks(
        live_server.url, tag_def.id_persistent, 0, 20, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json["tag_instances"]) == 0


def test_missing_tag_def(auth_server):
    live_server, cookies = auth_server
    rsp = post_tag_instance_chunks(
        live_server.url, c.id_tag_def_persistent_test, 0, 20, cookies=cookies
    )
    assert rsp.status_code == 400
    json = rsp.json()
    assert json["msg"] == (
        f"Tag definition with id_persistent {c.id_tag_def_persistent_test} "
        "does not exist."
    )


def test_can_slice(auth_server, tag_def_user, entity0):
    live_server, cookies = auth_server
    entity0.save()
    instances = [
        {
            "value": str(float(i) + 0.3),
            "id_entity_persistent": entity0.id_persistent,
            "id_tag_definition_persistent": tag_def_user.id_persistent,
        }
        for i in range(20)
    ]
    rsp = post_tag_instances(live_server.url, instances, cookies=cookies)
    assert rsp.status_code == 200
    instances_rsp = rsp.json()["tag_instances"]
    rsp = post_tag_instance_chunks(
        live_server.url,
        tag_def_user.id_persistent,
        instances_rsp[3]["version"],
        4,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    instances = rsp.json()["tag_instances"]
    assert len(instances) == 4
    for i in range(4):
        assert instances[i]["value"] == str(float(i) + 3.3)


def test_non_existent_slice(auth_server, tag_def, entity0):
    live_server, cookies = auth_server
    entity0.save()
    instances = [
        {
            "value": float(i) + 0.3,
            "id_entity_persistent": entity0.id_persistent,
            "id_tag_definition_persistent": tag_def.id_persistent,
        }
        for i in range(2)
    ]
    post_tag_instances(live_server.url, instances, cookies=cookies)
    rsp = post_tag_instance_chunks(
        live_server.url, tag_def.id_persistent, 30000, 4, cookies=cookies
    )
    assert rsp.status_code == 200
    persons = rsp.json()["tag_instances"]
    assert len(persons) == 0


def test_request_too_large(auth_server):
    live_server, cookies = auth_server
    rsp = post_tag_instance_chunks(
        live_server.url, "test_id_persistent", 0, 10001, cookies=cookies
    )
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Please specify limit smaller than 10000."


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.tag.models_django.TagInstance.by_tag_chunked_queryset", mock):
        rsp = post_tag_instance_chunks(
            live_server.url, "test_id_persistent", 0, 2, cookies=cookies
        )
    assert rsp.status_code == 500
    assert rsp.json()["msg"] == "Could not get requested chunk."


def test_not_logged_in(live_server):
    rsp = post_tag_instance_chunks(live_server.url, "test_id_persistent", 0, 2)
    assert rsp.status_code == 401
