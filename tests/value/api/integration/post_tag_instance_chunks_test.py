# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.column.common as c
from tests.value.api.integration.requests import (
    post_value_chunks,
    post_value_list,
)


def test_empty_chunk(auth_server, column):
    live_server, cookies = auth_server
    rsp = post_value_chunks(
        live_server.url, column.id_persistent, 0, 20, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json["value_list"]) == 0


def test_missing_column(auth_server):
    live_server, cookies = auth_server
    rsp = post_value_chunks(
        live_server.url, c.id_column_persistent_test, 0, 20, cookies=cookies
    )
    assert rsp.status_code == 400
    json = rsp.json()
    assert json["msg"] == (
        f"Column with id_persistent {c.id_column_persistent_test} " "does not exist."
    )


def test_can_slice(auth_server, column_user, entity0):
    live_server, cookies = auth_server
    entity0.save()
    instances = [
        {
            "value": str(float(i) + 0.3),
            "id_entity_persistent": entity0.id_persistent,
            "id_column_persistent": column_user.id_persistent,
        }
        for i in range(20)
    ]
    rsp = post_value_list(live_server.url, instances, cookies=cookies)
    assert rsp.status_code == 200
    instances_rsp = rsp.json()["value_list"]
    rsp = post_value_chunks(
        live_server.url,
        column_user.id_persistent,
        instances_rsp[3]["version"],
        4,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    instances = rsp.json()["value_list"]
    assert len(instances) == 4
    for i in range(4):
        assert instances[i]["value"] == str(float(i) + 3.3)


def test_non_existent_slice(auth_server, column, entity0):
    live_server, cookies = auth_server
    entity0.save()
    instances = [
        {
            "value": float(i) + 0.3,
            "id_entity_persistent": entity0.id_persistent,
            "id_column_persistent": column.id_persistent,
        }
        for i in range(2)
    ]
    post_value_list(live_server.url, instances, cookies=cookies)
    rsp = post_value_chunks(
        live_server.url, column.id_persistent, 30000, 4, cookies=cookies
    )
    assert rsp.status_code == 200
    persons = rsp.json()["value_list"]
    assert len(persons) == 0


def test_request_too_large(auth_server):
    live_server, cookies = auth_server
    rsp = post_value_chunks(
        live_server.url, "test_id_persistent", 0, 10001, cookies=cookies
    )
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Please specify limit smaller than 10000."


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.value.models_django.Value.by_column_chunked_queryset", mock):
        rsp = post_value_chunks(
            live_server.url, "test_id_persistent", 0, 2, cookies=cookies
        )
    assert rsp.status_code == 500
    assert rsp.json()["msg"] == "Could not get requested chunk."


def test_not_logged_in(live_server):
    rsp = post_value_chunks(live_server.url, "test_id_persistent", 0, 2)
    assert rsp.status_code == 401
