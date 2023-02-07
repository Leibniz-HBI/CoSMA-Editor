# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.entity.common as ce
import tests.tag.common as c
from tests.tag.api.integration import requests as r
from cosmae.exception import InvalidTagValueException


def test_id_no_version(live_server, float_tag):
    float_tag["id_persistent"] = c.id_tag_def_parent_persistent_test
    req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 400
    assert (
        req.json()["msg"] == "Tag instance with id_persistent "
        f"{c.id_tag_def_parent_persistent_test} has no previous version."
    )


def test_no_id_version(live_server, float_tag):
    float_tag["version"] = 5
    req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Tag instance with id_entity_persistent {ce.id_persistent_test_0}, "
        f"id_tag_definition_persistent {c.id_tag_def_persistent_test} and "
        f"value {float_tag['value']} has version but no id_persistent."
    )


def test_concurrent_modification(live_server, float_tag):
    req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 200
    created = req.json()["tag_instances"][0]
    created["value"] = "1.0"
    req = r.post_tag_instance(live_server.url, created)
    assert req.status_code == 200
    created["value"] = "3.0"
    req = r.post_tag_instance(live_server.url, created)
    assert req.status_code == 500
    assert req.json()["msg"] == (
        "There has been a concurrent modification "
        "to the tag instance with id_persistent "
        f'{created["id_persistent"]}.'
    )


def test_no_modification_is_returned(live_server, float_tag):
    req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 200
    created = req.json()["tag_instances"][0]
    req = r.post_tag_instance(live_server.url, created)
    assert req.status_code == 200
    tag_instances = req.json()["tag_instances"]
    assert len(tag_instances) == 1
    assert tag_instances[0] == created


def test_exists(live_server, float_tag):
    mock = MagicMock()
    mock.return_value = "same_id"
    with patch("cosmae.tag.api.instances.uuid4", mock):
        req = r.post_tag_instance(live_server.url, float_tag)
        assert req.status_code == 200
        req = r.post_tag_instance(live_server.url, float_tag)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate id_persistent for tag instance with "
            f"id_entity_persistent {ce.id_persistent_test_0}, "
            f"id_tag_definition_persistent {c.id_tag_def_persistent_test} and "
            f'value {float_tag["value"]}.'
        )


def test_invalid_value(live_server, float_tag):
    mock = MagicMock()
    mock.side_effect = InvalidTagValueException("id_persistent_test", 2.3, "INT")
    with patch("cosmae.tag.models_django.TagDefinition.check_value", mock):
        float_tag["value"] = 2
        req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == "Value 2.3 should be of type INT for tag with id_persistent id_persistent_test."
    )


def test_no_tag_def(live_server, entity0):
    entity0.save()
    tag_inst = {
        "value": "2.0",
        "id_tag_definition_persistent": "not_existent_id_persistent_test",
        "id_entity_persistent": entity0.id_persistent,
    }
    req = r.post_tag_instance(live_server.url, tag_inst)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        f'There is no tag definition with id_persistent {tag_inst["id_tag_definition_persistent"]}.'
    )


def test_no_entity(live_server, tag_def):
    tag_def.save()
    tag_inst = {
        "value": "2.0",
        "id_tag_definition_persistent": tag_def.id_persistent,
        "id_entity_persistent": "not_existent_id_persistent_test",
    }
    req = r.post_tag_instance(live_server.url, tag_inst)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        f'There is no entity with id_persistent {tag_inst["id_entity_persistent"]}.'
    )


def test_bad_db(live_server, float_tag):
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.tag.models_django.TagInstance.save", mock):
        req = r.post_tag_instance(live_server.url, float_tag)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."
