# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,protected-access,duplicate-code
from datetime import timedelta

import pytest

import tests.column.common as c
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.exception import (
    ColumnExistsException,
    DbObjectExistsException,
    InvalidValueException,
    NoParentColumnException,
)
from cosmae.util import timestamp


@pytest.mark.django_db
def test_different_name(column_history):
    column1 = ColumnHistory(
        id_persistent=column_history.id_persistent,
        time_edit=column_history.time_edit,
        name="changed column name",
        type=column_history.type,
    )
    assert column_history.check_different_before_save(column1)
    assert column1.check_different_before_save(column_history)


@pytest.mark.django_db
def test_different_id_parent(column_history):
    column1 = ColumnHistory(
        id_persistent=column_history.id_persistent,
        time_edit=column_history.time_edit,
        id_parent_persistent=c.id_column_parent_persistent_test,
        name=c.name_column_test,
        type=column_history.type,
    )
    assert column_history.check_different_before_save(column1)
    assert column1.check_different_before_save(column_history)


@pytest.mark.django_db
def test_different_type(column_history):
    column1 = ColumnHistory(
        id_persistent=column_history.id_persistent,
        time_edit=column_history.time_edit,
        name=c.name_column_test,
        type=Column.BOOL,
    )
    assert column_history.check_different_before_save(column1)
    assert column1.check_different_before_save(column_history)


@pytest.mark.django_db
def test_same(column_history, user):
    column1 = ColumnHistory(
        id_persistent=column_history.id_persistent,
        time_edit=column_history.time_edit,
        name=c.name_column_test,
        type=Column.FLOAT,
        owner=user,
    )
    assert not column_history.check_different_before_save(column1)
    assert not column1.check_different_before_save(column_history)


@pytest.mark.django_db
def test_store_and_retrieve_column(column_history):
    column_history.save()
    retrieved = Column.objects.get(name=c.name_column_test)  # pylint: disable=no-member
    assert retrieved.id == column_history.id
    assert not column_history.check_different_before_save(retrieved)


@pytest.mark.django_db
def test_missing_parent(user):
    with pytest.raises(NoParentColumnException) as exc:
        ColumnHistory.change_or_create_versioned(
            c.id_column_persistent_test,
            written_by_session=user.edit_session,
            time_edit=c.time_edit_test,
            name=c.name_column_test,
            id_parent_persistent=c.id_column_parent_persistent_test,
            owner=user,
        )
    assert exc.value.args[0] == c.id_column_parent_persistent_test


@pytest.mark.django_db
def test_valid_parent_same_name(column_history):
    column_history.id_persistent = c.id_column_parent_persistent_test
    column_history.type = Column.INNER
    column_history.save()
    ret, _ = ColumnHistory.change_or_create_versioned(
        c.id_column_persistent_test,
        written_by_session=column_history.owner.edit_session,
        time_edit=c.time_edit_test,
        name=c.name_column_test,
        id_parent_persistent=c.id_column_parent_persistent_test,
        owner=column_history.owner,
    )
    assert ret.id_parent_persistent == c.id_column_parent_persistent_test


@pytest.mark.django_db
def test_column_exists_root(column, user):

    with pytest.raises(ColumnExistsException) as exc:
        ColumnHistory.change_or_create_versioned(
            None,
            c.time_edit_test,
            user.edit_session,
            name=c.name_column_test,
            owner=user,
        )
    assert exc.value.args[0] == c.name_column_test
    assert exc.value.args[1] == c.id_column_persistent_test
    assert exc.value.args[2] is None


@pytest.mark.django_db
def test_column_exists_child(column_parent, user):
    old, _ = ColumnHistory.change_or_create_versioned(
        c.id_column_persistent_test,
        c.time_edit_test,
        user.edit_session,
        name=c.name_column_test,
        id_parent_persistent=c.id_column_parent_persistent_test,
        owner=user,
    )
    old.save()

    with pytest.raises(ColumnExistsException) as exc:
        ColumnHistory.change_or_create_versioned(
            "other_column_id_test",
            c.time_edit_test,
            user.edit_session,
            name=c.name_column_test,
            id_parent_persistent=c.id_column_parent_persistent_test,
            owner=user,
        )
    assert exc.value.args[0] == c.name_column_test
    assert exc.value.args[1] == c.id_column_persistent_test
    assert exc.value.args[2] == c.id_column_parent_persistent_test


@pytest.mark.django_db
def test_column_exists_rename(column, column_user):
    with pytest.raises(DbObjectExistsException) as exc:
        ColumnHistory.change_or_create_versioned(
            c.id_column_persistent_test,
            c.time_edit_test,
            column_user.owner.id_persistent,
            name=c.name_column_test_user,
        )

    assert exc.value.args[0] == c.id_column_persistent_test
    assert exc.value.args[1]["name"] == c.name_column_test_user


@pytest.mark.django_db
def test_float_check_valid(column):
    column.check_value(2.0)


@pytest.mark.django_db
def test_float_check_invalid(column):
    with pytest.raises(InvalidValueException) as exc:
        column.check_value("a")
    assert exc.value.args[0] == column.id_persistent
    assert exc.value.args[1] == "a"
    assert exc.value.args[2] == "FLT"


@pytest.mark.django_db
def test_string_check_valid(column):
    column.type = Column.STRING
    column.check_value("foo")


@pytest.mark.django_db
def test_string_check_invalid(column):
    column.type = Column.STRING
    with pytest.raises(InvalidValueException) as exc:
        column.check_value(None)
    assert exc.value.args[0] == column.id_persistent
    assert exc.value.args[1] is None
    assert exc.value.args[2] == "STR"


@pytest.mark.django_db
def test_inner_check_true_valid(column):
    column.type = Column.BOOL
    column.check_value("true")


@pytest.mark.django_db
def test_inner_check_false_valid(column):
    column.type = Column.BOOL
    column.check_value("false")


@pytest.mark.django_db
def test_inner_check_invalid(column):
    column.type = Column.BOOL
    with pytest.raises(InvalidValueException) as exc:
        column.check_value(True)
    assert exc.value.args[0] == column.id_persistent
    assert exc.value.args[1]
    assert exc.value.args[2] == "BOL"


@pytest.mark.django_db
def test_childrens(column_parent, column_child_0, column_child_1):
    ret = Column.children_query_set(c.id_column_parent_persistent_test)
    assert set(ret) == {column_child_0, column_child_1}


@pytest.mark.django_db
def test_children_updated(column_parent, column_child_0, column_child_1):
    column_child_0_updated_history, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=column_child_0.id_persistent,
        type=Column.FLOAT,
        id_parent_persistent=c.id_column_parent_persistent_test,
        name=column_child_0.name + "modified",
        time_edit=column_child_0.time_edit + timedelta(seconds=10),
        version=column_child_0.id,
        written_by_session=column_child_0.owner.edit_session,
    )
    column_child_0_updated_history.save()
    column_child_0_updated = Column.objects.get(  # pylint: disable=no-member
        id=column_child_0_updated_history.id
    )
    ret = Column.children_query_set(c.id_column_parent_persistent_test)
    assert set(ret) == {column_child_1, column_child_0_updated}


@pytest.mark.django_db
def test_children_empty(column_parent):
    ret = Column.children_query_set(c.id_column_parent_persistent_test)
    assert not ret


@pytest.mark.django_db
def test_children_root(column):
    ret = Column.children_query_set(None)
    assert list(ret) == [column]


@pytest.mark.django_db
def test_only_for_user(column_user, column_no_owner_history):
    ret = Column.for_user(column_user.owner).get()
    assert ret == column_user


@pytest.mark.django_db
def test_most_recent_for_user(column_user):
    column_edited, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=column_user.id_persistent,
        id_parent_persistent=None,
        time_edit=timestamp(),
        name="new_name",
        owner_id=column_user.owner.id,
        version=column_user.id,
        written_by_session=column_user.owner.edit_session,
    )
    column_edited.save()
    ret = Column.for_user(column_user.owner).get()
    assert ret._get_history_entry() == column_edited


@pytest.mark.django_db
def test_can_create_hidden(user):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_test,
        id_parent_persistent=None,
        time_edit=timestamp(),
        name="new_name",
        hidden=True,
        written_by_session=user.edit_session,
        owner=user,
    )
    column.save()
    retrieved = Column.most_recent_by_id(c.id_column_persistent_test)
    assert retrieved.hidden
