# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.entity.common as ce
import tests.tag.common as c
from tests.tag.api.integration import requests as r
from cosmae.exception import InvalidTagValueException


def test_id_no_version(auth_server, float_tag):
    live_server, cookies = auth_server
    float_tag["id_persistent"] = c.id_tag_def_parent_persistent_test
    req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"] == "Tag instance with id_persistent "
        f"{c.id_tag_def_parent_persistent_test} has no previous version."
    )


def test_no_id_version(auth_server, float_tag):
    live_server, cookies = auth_server
    float_tag["version"] = 5
    req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Tag instance with id_entity_persistent {ce.id_persistent_test_0}, "
        f"id_tag_definition_persistent {c.id_tag_def_persistent_test_user} and "
        f"value {float_tag['value']} has version but no id_persistent."
    )


def test_concurrent_modification(auth_server, float_tag):
    live_server, cookies = auth_server
    req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["tag_instances"][0]
    created["value"] = "1.0"
    req = r.post_tag_instance(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    changed = req.json()["tag_instances"][0]
    created["value"] = "3.0"
    req = r.post_tag_instance(live_server.url, created, cookies=cookies)
    assert req.status_code == 409
    rsp_json = req.json()
    assert rsp_json["msg"] == (
        "There has been a concurrent modification "
        "to the tag instance with id_persistent "
        f'{created["id_persistent"]}.'
    )
    assert rsp_json["tag_instances"] == [changed]


def test_no_modification_is_returned(auth_server, float_tag):
    live_server, cookies = auth_server
    req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["tag_instances"][0]
    req = r.post_tag_instance(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    tag_instances = req.json()["tag_instances"]
    assert len(tag_instances) == 1
    assert tag_instances[0] == created


def test_exists(auth_server, float_tag):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.return_value = "same_id"
    with patch("cosmae.tag.api.instances.uuid4", mock):
        req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
        assert req.status_code == 200
        req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate id_persistent for tag instance with "
            f"id_entity_persistent {ce.id_persistent_test_0}, "
            f"id_tag_definition_persistent {c.id_tag_def_persistent_test_user} and "
            f'value {float_tag["value"]}.'
        )


def test_invalid_value(auth_server, float_tag):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = InvalidTagValueException("id_persistent_test", 2.3, "INT")
    with patch("cosmae.tag.models_django.TagDefinition.check_value", mock):
        float_tag["value"] = 2
        req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == "Value 2.3 should be of type INT for tag with id_persistent id_persistent_test."
    )


def test_no_tag_def(auth_server, entity0):
    live_server, cookies = auth_server
    entity0.save()
    tag_inst = {
        "value": "2.0",
        "id_tag_definition_persistent": "not_existent_id_persistent_test",
        "id_entity_persistent": entity0.id_persistent,
    }
    req = r.post_tag_instance(live_server.url, tag_inst, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        f'There is no tag definition with id_persistent {tag_inst["id_tag_definition_persistent"]}.'
    )


def test_no_entity(auth_server, tag_def):
    live_server, cookies = auth_server
    tag_def.save()
    tag_inst = {
        "value": "2.0",
        "id_tag_definition_persistent": tag_def.id_persistent,
        "id_entity_persistent": "not_existent_id_persistent_test",
    }
    req = r.post_tag_instance(live_server.url, tag_inst, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        f'There is no entity with id_persistent {tag_inst["id_entity_persistent"]}.'
    )


def test_bad_db(auth_server, float_tag):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.tag.models_django.TagInstanceHistory.save", mock):
        req = r.post_tag_instance(live_server.url, float_tag, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."


def test_not_logged_in(live_server, float_tag):
    req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 401
