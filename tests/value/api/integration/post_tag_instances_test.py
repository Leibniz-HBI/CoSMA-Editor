# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.column.common as cc
import tests.entity.common as ce
from cosmae.exception import InvalidValueException
from tests.value.api.integration import requests as r


def test_id_no_version(auth_server, float_column):
    live_server, cookies = auth_server
    float_column["id_persistent"] = cc.id_column_parent_persistent_test
    req = r.post_value(live_server.url, float_column, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"] == "Value with id_persistent "
        f"{cc.id_column_parent_persistent_test} has no previous version."
    )


def test_no_id_version(auth_server, float_column):
    live_server, cookies = auth_server
    float_column["version"] = 5
    req = r.post_value(live_server.url, float_column, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Value with id_entity_persistent {ce.id_persistent_test_0}, "
        f"id_column_persistent {cc.id_column_persistent_test_user} and "
        f"value {float_column['value']} has version but no id_persistent."
    )


def test_disabled_column(auth_server, column_disabled, entity0):
    live_server, cookies = auth_server
    req = r.post_value(
        live_server.url,
        {
            "id_column_persistent": column_disabled.id_persistent,
            "id_entity_persistent": entity0.id_persistent,
            "value": "some_value",
        },
        cookies=cookies,
    )
    assert req.status_code == 403


def test_concurrent_modification(auth_server, float_column):
    live_server, cookies = auth_server
    req = r.post_value(live_server.url, float_column, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["value_list"][0]
    created["value"] = "1.0"
    req = r.post_value(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    changed = req.json()["value_list"][0]
    created["value"] = "3.0"
    req = r.post_value(live_server.url, created, cookies=cookies)
    assert req.status_code == 409
    rsp_json = req.json()
    assert rsp_json["msg"] == (
        "There has been a concurrent modification "
        "to the value with id_persistent "
        f'{created["id_persistent"]}.'
    )
    assert rsp_json["value_list"] == [changed]


def test_no_modification_is_returned(auth_server, float_column):
    live_server, cookies = auth_server
    req = r.post_value(live_server.url, float_column, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["value_list"][0]
    req = r.post_value(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    values = req.json()["value_list"]
    assert len(values) == 1
    assert values[0] == created


def test_exists(auth_server, float_column):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.return_value = "67b707e7-2bb0-44fe-8070-b78857b31d1c"
    with patch("cosmae.value.api.uuid4", mock):
        req = r.post_value(live_server.url, float_column, cookies=cookies)
        assert req.status_code == 200
        req = r.post_value(live_server.url, float_column, cookies=cookies)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate id_persistent for value with "
            f"id_entity_persistent {ce.id_persistent_test_0}, "
            f"id_column_persistent {cc.id_column_persistent_test_user} and "
            f'value {float_column["value"]}.'
        )


def test_invalid_value(auth_server, float_column):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = InvalidValueException("id_persistent_test", 2.3, "INT")
    with patch("cosmae.column.models_django.Column.check_value", mock):
        float_column["value"] = "2"
        req = r.post_value(live_server.url, float_column, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == "Value 2.3 should be of type INT for column with id_persistent id_persistent_test."
    )


def test_no_column(auth_server, entity0):
    live_server, cookies = auth_server
    entity0.save()
    value = {
        "value": "2.0",
        "id_column_persistent": "not_existent_id_persistent_test",
        "id_entity_persistent": entity0.id_persistent,
    }
    req = r.post_value(live_server.url, value, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        f'There is no column with id_persistent {value["id_column_persistent"]}.'
    )


def test_no_entity(auth_server, column):
    live_server, cookies = auth_server
    value = {
        "value": "2.0",
        "id_column_persistent": column.id_persistent,
        "id_entity_persistent": "not_existent_id_persistent_test",
    }
    req = r.post_value(live_server.url, value, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        f'There is no entity with id_persistent {value["id_entity_persistent"]}.'
    )


def test_bad_db(auth_server, float_column):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.value.models_django.ValueHistory.save", mock):
        req = r.post_value(live_server.url, float_column, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."


def test_not_logged_in(live_server, float_column, mock_csrf):
    req = r.post_value(live_server.url, float_column)
    assert req.status_code == 401
