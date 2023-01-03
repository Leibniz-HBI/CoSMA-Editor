# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

import tests.tag.common as c
from tests.tag.api.integration.requests import (
    post_tag_instance_chunks,
    post_tag_instances,
)
from cosmae.entity.models_django import Entity
from cosmae.tag.models_django import TagDefinition


def test_empty_chunk(live_server, tag_def):
    tag_def.save()
    rsp = post_tag_instance_chunks(live_server.url, tag_def.id_persistent, 0, 20)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json["tag_instances"]) == 0


def test_missing_tag_def(live_server):
    rsp = post_tag_instance_chunks(live_server.url, c.id_tag_def_persistent_test, 0, 20)
    assert rsp.status_code == 400
    json = rsp.json()
    assert json["msg"] == (
        f"Tag definition with id_persistent {c.id_tag_def_persistent_test} "
        "does not exist."
    )


def test_can_slice(live_server, tag_def, entity0):
    tag_def.save()
    entity0.save()
    instances = [
        {
            "value": float(i) + 0.3,
            "id_entity_persistent": entity0.id_persistent,
            "id_tag_definition_persistent": tag_def.id_persistent,
        }
        for i in range(20)
    ]
    rsp = post_tag_instances(live_server.url, instances)
    assert rsp.status_code == 200
    rsp = post_tag_instance_chunks(live_server.url, tag_def.id_persistent, 3, 4)
    assert rsp.status_code == 200
    persons = rsp.json()["tag_instances"]
    assert len(persons) == 4
    for i in range(4):
        assert persons[i]["value"] == float(i) + 3.3


def test_non_existent_slice(live_server, tag_def, entity0):
    tag_def.save()
    entity0.save()
    instances = [
        {
            "value": float(i) + 0.3,
            "id_entity_persistent": entity0.id_persistent,
            "id_tag_definition_persistent": tag_def.id_persistent,
        }
        for i in range(2)
    ]
    post_tag_instances(live_server.url, instances)
    rsp = post_tag_instance_chunks(live_server.url, tag_def.id_persistent, 3, 4)
    assert rsp.status_code == 200
    persons = rsp.json()["tag_instances"]
    assert len(persons) == 0


def test_get_children(live_server, entity0, tag_def_child_0, tag_def_child_1):
    entity0.save()
    tag_def_parent = TagDefinition(
        id_persistent=c.id_tag_def_parent_persistent_test,
        type=TagDefinition.INNER,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
    )
    tag_def_parent.save()
    entity1 = Entity(id_persistent="id_persistent_test_1", time_edit=c.time_edit_test)
    entity1.save()
    tag_def_child_0.id_parent_tag_definition = tag_def_parent.id_persistent
    tag_def_child_0.save()
    tag_def_child_1.id_parent_tag_definition = tag_def_parent.id_persistent
    tag_def_child_1.type = TagDefinition.FLOAT
    tag_def_child_1.save()
    tag_defs = [tag_def_parent, tag_def_child_0, tag_def_child_1]
    values = [None, 0.2, 0.3]
    entities = [entity0, entity1]
    instances = [
        {
            "id_entity_persistent": entities[j].id_persistent,
            "id_tag_definition_persistent": tag_defs[i].id_persistent,
            "value": values[i],
        }
        for i in range(3)
        for j in range(2)
    ]
    req = post_tag_instances(live_server.url, instances)
    assert req.status_code == 200
    req = post_tag_instance_chunks(live_server.url, tag_def_parent.id_persistent, 0, 10)
    assert req.status_code == 200
    api_instances = req.json()["tag_instances"]
    assert len(api_instances) == 6


def test_request_too_large(live_server):
    rsp = post_tag_instance_chunks(live_server.url, "test_id_persistent", 0, 10001)
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Please specify limit smaller than 10000."


def test_bad_db(live_server):
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.tag.models_django.TagInstance.by_tag_chunked", mock):
        rsp = post_tag_instance_chunks(live_server.url, "test_id_persistent", 0, 2)
    assert rsp.status_code == 500
    assert rsp.json()["msg"] == "Could not get requested chunk."
