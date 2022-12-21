# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest

import tests.entity.common as c
from cosmae.entity.models_django import Entity
from cosmae.exception import DbObjectExistsException, EntityUpdatedException


@pytest.fixture
def updated_entity0(entity0):
    return Entity(
        id_persistent=c.id_persistent_test_0,
        time_edit=c.time_edit_test_1,
        previous_version=entity0,
    )


@pytest.mark.django_db
def test_get_most_recent(entity0, updated_entity0):
    entity0.save()
    updated_entity0.previous_version = entity0
    updated_entity0.save()
    most_recent = Entity.most_recent_by_id(c.id_persistent_test_0)
    assert most_recent == updated_entity0
    assert most_recent.id != entity0.id


@pytest.mark.django_db
def test_creation():
    created, do_write = Entity.change_or_create(
        id_persistent=c.id_persistent_test_0,
        display_txt="new_txt",
        time_edit=c.time_edit_test_1,
        version=None,
    )
    assert do_write
    assert created.previous_version is None
    assert created.time_edit == c.time_edit_test_1
    assert created.display_txt == "new_txt"


@pytest.mark.django_db
def test_update(entity0):
    entity0.save()
    updated, do_write = Entity.change_or_create(
        id_persistent=entity0.id_persistent,
        display_txt="new_txt",
        time_edit=c.time_edit_test_1,
        version=entity0.id,
    )
    assert do_write
    assert updated.previous_version == entity0
    assert updated.time_edit == c.time_edit_test_1
    assert updated.display_txt == "new_txt"


@pytest.mark.django_db
def test_no_update_on_same(entity0):
    entity0.save()
    updated, do_write = Entity.change_or_create(
        id_persistent=entity0.id_persistent,
        display_txt=entity0.display_txt,
        time_edit=c.time_edit_test_1,
        version=entity0.id,
    )
    assert not do_write
    assert entity0 == updated


@pytest.mark.django_db
def test_no_update_without_version(entity0):
    entity0.save()
    with pytest.raises(DbObjectExistsException):
        Entity.change_or_create(
            id_persistent=entity0.id_persistent,
            display_txt="new_txt",
            time_edit=c.time_edit_test_1,
        )


@pytest.mark.django_db
def test_no_update_on_older_version(entity0, updated_entity0):
    entity0.save()
    updated_entity0.save()
    with pytest.raises(EntityUpdatedException):
        Entity.change_or_create(
            id_persistent=entity0.id_persistent,
            display_txt="new_txt",
            time_edit=c.time_edit_test_1,
            version=entity0.id,
        )


@pytest.mark.django_db
def test_count_updated_correctly(entity0):
    entity0.save()
    prev = entity0
    for i in range(10):
        prev, _ = Entity.change_or_create(
            display_txt=f"display_test_{i}",
            time_edit=c.time_edit_test_0,
            id_persistent=c.id_persistent_test_0,
            version=prev.id,
        )
        prev.save()
    assert Entity.get_count() == 1


@pytest.mark.django_db
def test_chunk_correctly(entity0, updated_entity0):
    entity0.save()
    updated_entity0.save()
    entities = [updated_entity0]
    for i in range(10):
        entity = Entity(
            id_persistent=f"id_persistent_test{i+10}", time_edit=c.time_edit_test_0
        )
        entity.save()
        entities.append(entity)
    chunks = [Entity.get_most_recent_chunked(i * 2, 2) for i in range(6)]
    flat = [x for chunk in chunks for x in chunk if chunk]
    assert flat == entities


@pytest.mark.django_db
def test_different_display_txt(entity0):
    entity1 = Entity(
        id_persistent=entity0.id_persistent,
        time_edit=entity0.time_edit,
        display_txt="test display",
    )
    assert entity0.check_different_before_save(entity1)


@pytest.mark.django_db
def test_different_id_persistent(entity0):
    entity1 = Entity(
        id_persistent="other id",
        time_edit=entity0.time_edit,
    )
    assert entity0.check_different_before_save(entity1)


@pytest.mark.django_db
def test_different_version(entity0):
    entity1 = Entity(
        id_persistent=entity0.id_persistent,
        time_edit=entity0.time_edit,
        previous_version=entity0,
    )
    assert not entity0.check_different_before_save(entity1)
