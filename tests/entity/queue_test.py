# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

import tests.tag.common as ct
from cosmae.entity.models_django import Entity
from cosmae.entity.queue import (
    entity_display_txt_information_cache,
    update_display_txt_cache,
)
from cosmae.tag.models_django import TagInstanceHistory

id_persistent_entity_no_display_txt = "7d5c19e6-f47d-4c4f-a92f-0c858c18885f"
time_edit_entity_no_display_txt = datetime(2002, 3, 7, tzinfo=timezone.utc)
id_persistent_instance_tag_def_1 = "4603a4ed-b1b2-4a25-9556-dd82011e3d06"
time_edit_instance_tag_def_1 = datetime(2002, 5, 6, tzinfo=timezone.utc)
value_instance_tag_def_1 = "Some value used as display txt"


@pytest.mark.django_db
def test_with_display_txt(entity0):
    update_display_txt_cache(entity0.id_persistent)
    result = entity_display_txt_information_cache.get(entity0.id_persistent)
    assert result == (entity0.display_txt, "display_txt")


@pytest.fixture
def entity_without_display_txt(db):
    entity, _ = Entity.change_or_create(
        id_persistent=id_persistent_entity_no_display_txt,
        time_edit=time_edit_entity_no_display_txt,
    )
    entity.save()
    return entity


def test_without_display_txt_and_no_tag_def_order(entity_without_display_txt):
    update_display_txt_cache(entity_without_display_txt.id_persistent)
    result = entity_display_txt_information_cache.get(
        entity_without_display_txt.id_persistent
    )
    assert result == (entity_without_display_txt.id_persistent, "id_persistent")


@pytest.fixture
def instance_tag_def_1(entity_without_display_txt, tag_def1):
    instance, _ = TagInstanceHistory.change_or_create(
        id_persistent=id_persistent_instance_tag_def_1,
        time_edit=time_edit_instance_tag_def_1,
        id_entity_persistent=entity_without_display_txt.id_persistent,
        id_tag_definition_persistent=tag_def1.id_persistent,
        value=value_instance_tag_def_1,
        user=tag_def1.owner,
    )
    instance.save()
    return instance


def test_without_display_txt_but_relevant_tag_instance(
    display_txt_order_0_1_curated, instance_tag_def_1
):
    update_display_txt_cache(instance_tag_def_1.id_entity_persistent)
    result = entity_display_txt_information_cache.get(
        instance_tag_def_1.id_entity_persistent
    )
    assert result[0] == value_instance_tag_def_1
    tag_def = result[1]
    assert len(tag_def) == 8
    assert "id" in tag_def
    tag_def.pop("id")
    assert tag_def == {
        "id_persistent": ct.id_tag_def_persistent_test_user1,
        "id_parent_persistent": None,
        "name": ct.name_tag_def_test1,
        "type": "STR",
        "owner": {"username": "test-user1"},
        "curated": False,
        "hidden": False,
    }


def test_without_display_txt_and_no_relevant_tag_instance(
    display_txt_order_0, instance_tag_def_1
):
    update_display_txt_cache(instance_tag_def_1.id_entity_persistent)
    result = entity_display_txt_information_cache.get(
        instance_tag_def_1.id_entity_persistent
    )
    assert result == (id_persistent_entity_no_display_txt, "id_persistent")


def test_exception(entity_without_display_txt):
    mock = MagicMock()
    mock.side_effect = Exception()
    with patch("cosmae.entity.queue.get_display_txt_order_tag_definitions", mock):
        update_display_txt_cache(entity_without_display_txt.id_persistent)
    result = entity_display_txt_information_cache.get(
        entity_without_display_txt.id_persistent
    )
    assert result == (entity_without_display_txt.id_persistent, "id_persistent")
