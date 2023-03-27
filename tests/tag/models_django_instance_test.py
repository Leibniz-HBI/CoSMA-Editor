# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from datetime import timedelta

import pytest

import tests.person.common as cp
import tests.tag.common as c
from cosmae.exception import EntityMissingException, TagDefinitionMissingException
from cosmae.tag.models_django import TagDefinition, TagInstance


@pytest.fixture
def tag():
    return TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=c.id_tag_def_persistent_test,
        time_edit=c.time_edit_test,
        value="2.0",
    )


def test_different_entity(tag):
    other = TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent="id_entity_test_1",
        id_tag_definition_persistent=c.id_tag_def_persistent_test,
        value="2.0",
    )
    assert other.check_different_before_save(tag)
    assert tag.check_different_before_save(other)


def test_different_value(tag):
    other = TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent="id_tag_def_persistent1",
        value="2.0",
    )
    assert other.check_different_before_save(tag)
    assert tag.check_different_before_save(other)


def test_different_tag_def(tag):
    other = TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=c.id_tag_def_persistent_test,
        value="1.0",
    )
    assert other.check_different_before_save(tag)
    assert tag.check_different_before_save(other)


def test_same(tag):
    other = TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=c.id_tag_def_persistent_test,
        value="2.0",
    )
    assert not other.check_different_before_save(tag)
    assert not tag.check_different_before_save(other)


@pytest.mark.django_db
def test_get_most_recent(tag):
    tag.save()
    new = TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=c.id_tag_def_persistent_test,
        value="1.0",
        time_edit=c.time_edit_test + timedelta(hours=1),
        previous_version=tag,
    )
    new.save()
    by_id = TagInstance.most_recent_by_id(c.id_tag_persistent_test)
    assert by_id.value == "1.0"


@pytest.mark.django_db
def test_get_most_recent_by_ids(tag):
    tag.save()
    new = TagInstance(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=c.id_tag_def_persistent_test,
        value="1.0",
        time_edit=c.time_edit_test + timedelta(hours=1),
        previous_version=tag,
    )
    new.save()
    results = TagInstance.most_recents_by_entity_and_definition_ids(
        cp.id_persistent_test, c.id_tag_def_persistent_test
    )
    assert results == [new]


@pytest.mark.django_db
def test_entity_missing():
    with pytest.raises(EntityMissingException) as exc:
        TagInstance.change_or_create(
            id_persistent=c.id_tag_persistent_test,
            time_edit=c.time_edit_test,
            id_entity_persistent=cp.id_persistent_test,
            id_tag_definition_persistent=c.id_tag_def_persistent_test,
        )
    assert exc.value.args[0] == cp.id_persistent_test


@pytest.mark.django_db
def test_tag_def_missing(entity0):
    entity0.save()
    with pytest.raises(TagDefinitionMissingException) as exc:
        TagInstance.change_or_create(
            id_persistent=c.id_tag_persistent_test,
            time_edit=c.time_edit_test,
            id_entity_persistent=entity0.id_persistent,
            id_tag_definition_persistent=c.id_tag_def_persistent_test,
        )
    assert exc.value.args[0] == c.id_tag_def_persistent_test


@pytest.mark.django_db
def test_add_tag_root(entity0, tag_def):
    entity0.save()
    tag_def.save()
    ret, _ = TagInstance.change_or_create(
        id_persistent=c.id_tag_persistent_test,
        time_edit=c.time_edit_test,
        id_entity_persistent=entity0.id_persistent,
        id_tag_definition_persistent=tag_def.id_persistent,
        value="2.0",
    )
    assert ret.value == "2.0"
    assert ret.id_persistent == c.id_tag_persistent_test
    assert ret.id_entity_persistent == entity0.id_persistent
    assert ret.id_tag_definition_persistent == tag_def.id_persistent
    assert ret.time_edit == c.time_edit_test
    assert ret.previous_version is None


@pytest.mark.django_db
def test_add_tag_child(entity0, tag_def):
    parent_tag, _ = TagDefinition.change_or_create(
        id_persistent=c.id_tag_def_parent_persistent_test,
        id_parent_persistent=None,
        time_edit=c.time_edit_test,
        name=c.name_tag_def_test,
        type=TagDefinition.INNER,
    )
    parent_tag.save()
    entity0.save()
    tag_def.id_parent_persistent = c.id_tag_def_parent_persistent_test
    tag_def.save()
    ret, _ = TagInstance.change_or_create(
        id_persistent=c.id_tag_persistent_test,
        time_edit=c.time_edit_test,
        id_entity_persistent=entity0.id_persistent,
        id_tag_definition_persistent=tag_def.id_persistent,
        value="2.0",
    )
    assert ret.value == "2.0"
    assert ret.id_persistent == c.id_tag_persistent_test
    assert ret.id_entity_persistent == entity0.id_persistent
    assert ret.id_tag_definition_persistent == tag_def.id_persistent
    assert ret.time_edit == c.time_edit_test
    assert ret.previous_version is None


@pytest.mark.django_db
def test_empty_chunk(tag_def):
    tag_def.save()
    ret = TagInstance.by_tag_chunked(tag_def.id_persistent, 2, 3)
    assert ret == []


@pytest.mark.django_db
def test_chunk_versions(tag_def):
    tag_def.save()
    last_values = []
    for i in range(10):
        tag = None
        previous_version = None
        for j in range(i % 3 + 1):
            tag = TagInstance(
                id_persistent=f"id_tag_test{i}",
                id_entity_persistent=cp.id_persistent_test,
                id_tag_definition_persistent=tag_def.id_persistent,
                time_edit=c.time_edit_test + timedelta(hours=j + 1),
                value=str(float(j)),
                previous_version=previous_version,
            )
            tag.save()
            previous_version = tag  # pylint: disable=no-member
        last_values.append(tag.value)
    ret = TagInstance.by_tag_chunked(c.id_tag_def_persistent_test, 2, 3)
    ret_values = [tag.value for tag in ret]
    assert ret_values == last_values[2 : 2 + 3]


@pytest.mark.django_db
def test_chunk_filter_tag_instance(tag_def):
    tag_def.save()
    for i in range(10):
        tag = TagInstance(
            id_persistent=f"id_tag_test{i}",
            id_entity_persistent=cp.id_persistent_test,
            id_tag_definition_persistent=tag_def.id_persistent + i * "0",
            time_edit=c.time_edit_test,
            value=str(float(i)),
        )
        tag.save()
    ret = TagInstance.by_tag_chunked(c.id_tag_def_persistent_test, 0, 5)
    assert len(ret) == 1


@pytest.mark.django_db
def test_chunk_filter_childrens_instance(tag_def, tag_def_child_0, tag_def_child_1):
    tag_def.type = TagDefinition.INNER
    tag_def.id_persistent = c.id_tag_def_parent_persistent_test
    tag_def.save()
    tag_def_child_0.save()
    tag_def_child_1.save()
    tag_instance_0 = TagInstance(
        id_persistent="id_tag_test_0",
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=tag_def_child_0.id_persistent,
        time_edit=c.time_edit_test,
        value=str(2.3),
    )
    tag_instance_0.save()
    tag_instance_1 = TagInstance(
        id_persistent="id_tag_test_1",
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=tag_def_child_1.id_persistent,
        time_edit=c.time_edit_test,
        value=str(5),
    )
    tag_instance_1.save()
    tag_instance_2 = TagInstance(
        id_persistent="id_tag_test_2",
        id_entity_persistent=cp.id_persistent_test,
        id_tag_definition_persistent=tag_def.id_persistent,
        time_edit=c.time_edit_test,
    )
    tag_instance_2.save()
    tags = TagInstance.by_tag_chunked(tag_def.id_persistent, 0, 5)
    assert tags == [tag_instance_0, tag_instance_1, tag_instance_2]


@pytest.mark.django_db
def test_not_existing_tag():
    with pytest.raises(TagDefinitionMissingException) as exc_info:
        TagInstance.by_tag_chunked(c.id_tag_def_persistent_test, 0, 5)
    assert exc_info.value.args[0] == c.id_tag_def_persistent_test
