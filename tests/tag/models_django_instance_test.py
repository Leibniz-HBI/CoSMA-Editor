# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from datetime import timedelta

import pytest

import tests.entity.common as ce
import tests.tag.common as c
from cosmae.exception import (
    ColumnDisabledException,
    ColumnMissingException,
    EntityMissingException,
    PermissionException,
)
from cosmae.value.models_django import Value, ValueHistory


@pytest.fixture
def value(user):
    return ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=ce.id_persistent_test,
        id_column_persistent=c.id_column_persistent_test,
        time_edit=c.time_edit_test,
        value="2.0",
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


def test_different_entity(value):
    other = ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent="id_entity_test_1",
        id_column_persistent=c.id_column_persistent_test,
        value="2.0",
    )
    assert other.check_different_before_save(value)
    assert value.check_different_before_save(other)


def test_different_value(value):
    other = ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=ce.id_persistent_test,
        id_column_persistent="id_tag_def_persistent1",
        value="2.0",
    )
    assert other.check_different_before_save(value)
    assert value.check_different_before_save(other)


def test_different_tag_def(value):
    other = ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=ce.id_persistent_test,
        id_column_persistent=c.id_column_persistent_test,
        value="1.0",
    )
    assert other.check_different_before_save(value)
    assert value.check_different_before_save(other)


def test_same(value):
    other = ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=ce.id_persistent_test,
        id_column_persistent=c.id_column_persistent_test,
        value="2.0",
    )
    assert not other.check_different_before_save(value)
    assert not value.check_different_before_save(other)


@pytest.mark.django_db
def test_get_most_recent(value):
    value.save()
    new = ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=ce.id_persistent_test,
        id_column_persistent=c.id_column_persistent_test,
        value="1.0",
        time_edit=c.time_edit_test + timedelta(hours=1),
        previous_version=value,
        written_by_session=value.written_by_session,
        approved_by=value.approved_by,
    )
    new.save()
    by_id = Value.get_by_id(c.id_tag_persistent_test)
    assert by_id.value == "1.0"


@pytest.mark.django_db
def test_get_most_recent_by_ids(value):
    value.save()
    new = ValueHistory(
        id_persistent=c.id_tag_persistent_test,
        id_entity_persistent=ce.id_persistent_test,
        id_column_persistent=c.id_column_persistent_test,
        value="1.0",
        time_edit=c.time_edit_test + timedelta(hours=1),
        previous_version=value,
        written_by_session=value.written_by_session,
        approved_by=None,
    )
    new.save()
    results = Value.most_recent_by_entity_and_definition_id_query_set(
        ce.id_persistent_test, c.id_column_persistent_test
    )
    assert list(results) == [new]


@pytest.mark.django_db
def test_entity_missing(user, tag_def):
    with pytest.raises(EntityMissingException) as exc:
        ValueHistory.change_or_create_versioned(
            id_persistent=c.id_tag_persistent_test,
            time_edit=c.time_edit_test,
            written_by_session=user.edit_session,
            id_entity_persistent=ce.id_persistent_test,
            id_column_persistent=c.id_column_persistent_test,
        )
    assert exc.value.args[0] == ce.id_persistent_test


@pytest.mark.django_db
def test_tag_def_missing(entity0, user):
    entity0.save()
    with pytest.raises(ColumnMissingException) as exc:
        ValueHistory.change_or_create_versioned(
            id_persistent=c.id_tag_persistent_test,
            time_edit=c.time_edit_test,
            written_by_session=user.edit_session,
            id_entity_persistent=entity0.id_persistent,
            id_column_persistent=c.id_column_persistent_test,
        )
    assert exc.value.args[0] == c.id_column_persistent_test


@pytest.mark.django_db
def test_disabled_tag(column_disabled, entity0):
    id_persistent = "7693b6cd-b0da-4207-adc1-e15f367b010a"
    with pytest.raises(ColumnDisabledException):
        ValueHistory.change_or_create_versioned(
            id_persistent=id_persistent,
            id_column_persistent=column_disabled.id_persistent,
            id_entity_persistent=entity0.id_persistent,
            value="some value",
            written_by_session=column_disabled.owner.edit_session,
            time_edit=c.time_edit_test,
        )


@pytest.mark.django_db
def test_tag_def_no_permission(entity0, tag_def_user, user1):
    entity0.save()
    with pytest.raises(PermissionException) as exc:
        ValueHistory.change_or_create_versioned(
            id_persistent=c.id_tag_persistent_test,
            time_edit=c.time_edit_test,
            written_by_session=user1.edit_session,
            value=2.0,
            id_entity_persistent=entity0.id_persistent,
            id_column_persistent=tag_def_user.id_persistent,
        )
    assert exc.value.args[0] == c.id_tag_persistent_test


@pytest.mark.django_db
def test_add_tag_root(entity0, tag_def_user):
    entity0.save()
    ret, _ = ValueHistory.change_or_create_versioned(
        id_persistent=c.id_tag_persistent_test,
        time_edit=c.time_edit_test,
        written_by_session=tag_def_user.owner.edit_session,
        id_entity_persistent=entity0.id_persistent,
        id_column_persistent=tag_def_user.id_persistent,
        value="2.0",
    )
    assert ret.value == "2.0"
    assert ret.id_persistent == c.id_tag_persistent_test
    assert ret.id_entity_persistent == entity0.id_persistent
    assert ret.id_column_persistent == tag_def_user.id_persistent
    assert ret.time_edit == c.time_edit_test
    assert ret.previous_version is None


@pytest.mark.django_db
def test_empty_chunk(tag_def):
    ret = Value.by_column_chunked_queryset(tag_def.id_persistent, 2, 3)
    assert not list(ret)


@pytest.mark.django_db
def test_chunk_versions(tag_def):
    last_values = []
    last_ids = []
    for i in range(10):
        tag = None
        previous_version = None
        for j in range(i % 3 + 1):
            tag = ValueHistory(
                id_persistent=f"id_tag_test{i}",
                id_entity_persistent=ce.id_persistent_test,
                id_column_persistent=tag_def.id_persistent,
                time_edit=c.time_edit_test + timedelta(hours=j + 1),
                value=str(float(j)),
                previous_version=previous_version,
                written_by_session=tag_def.written_by_session,
                approved_by=tag_def.approved_by,
            )
            tag.save()
            previous_version = tag  # pylint: disable=no-member
        last_ids.append(tag.id)  # pylint: disable=no-member
        last_values.append(tag.value)
    ret = Value.by_column_chunked_queryset(c.id_column_persistent_test, last_ids[2], 3)
    ret_values = [tag.value for tag in ret]
    assert ret_values == last_values[2 : 2 + 3]


@pytest.mark.django_db
def test_chunk_filter_tag_instance(tag_def):
    for i in range(10):
        tag = ValueHistory(
            id_persistent=f"id_tag_test{i}",
            id_entity_persistent=ce.id_persistent_test,
            id_column_persistent=tag_def.id_persistent + i * "0",
            time_edit=c.time_edit_test,
            value=str(float(i)),
            written_by_session=tag_def.written_by_session,
            approved_by=None,
        )
        tag.save()
    ret = Value.by_column_chunked_queryset(c.id_column_persistent_test, 0, 5)
    assert len(ret) == 1


@pytest.mark.django_db
def test_not_existing_tag():
    with pytest.raises(ColumnMissingException) as exc_info:
        Value.by_column_chunked_queryset(c.id_column_persistent_test, 0, 5)
    assert exc_info.value.args[0] == c.id_column_persistent_test
