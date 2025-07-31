# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
from datetime import timedelta

import pytest

import tests.column.common as c
from cosmae.column.models_django import (
    Column,
    ColumnHistory,
    OwnershipRequest,
    column_objects,
)


@pytest.fixture
def column_history(db, user):
    "Shared column for tests."
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_test,
        type=Column.FLOAT,
        id_parent_persistent=None,
        name=c.name_column_test,
        time_edit=c.time_edit_test,
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def column_no_owner_history(db, user_commissioner):
    "Shared column for tests."
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_test,
        type=Column.FLOAT,
        id_parent_persistent=None,
        name=c.name_column_test,
        time_edit=c.time_edit_test,
        owner_id=None,
        written_by_session=user_commissioner.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def column(column_history):
    return column_objects().get(id=column_history.id)  # pylint: disable=no-member


@pytest.fixture
def column_parent(db, user):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_parent_persistent_test,
        time_edit=c.time_edit_test + timedelta(seconds=5),
        written_by_session=user.edit_session,
        type=Column.INNER,
        name=c.name_column_parent_test,
        owner=user,
    )
    column.save()
    return column


@pytest.fixture
def column_child_0_history(user):
    "A shared child column for tests"
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_child_0,
        type=Column.FLOAT,
        id_parent_persistent=c.id_column_parent_persistent_test,
        name="test column child 0",
        time_edit=c.time_edit_test + timedelta(seconds=10),
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def column_child_0(column_child_0_history):
    return column_objects().get(
        id=column_child_0_history.id
    )  # pylint: disable=no-member


@pytest.fixture
def column_parent_future(column_history):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_parent_persistent_test,
        time_edit=c.time_edit_test + timedelta(seconds=50),
        written_by_session=column_history.written_by_session,
        type=Column.INNER,
        name=c.name_column_parent_test_changed,
        owner=column_history.owner,
        previous_version=column_history,
    )
    column.save()
    return column


@pytest.fixture
def column_child_1_history(user):
    "Another shared child column for tests"
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_child_1,
        type=Column.FLOAT,
        id_parent_persistent=c.id_column_parent_persistent_test,
        name="test column child 1",
        time_edit=c.time_edit_test + timedelta(seconds=10),
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def column_child_1(column_child_1_history):
    return column_objects().get(
        id=column_child_1_history.id
    )  # pylint: disable=no-member


@pytest.fixture
def column_child_parent_history(user):
    "Another shared child column for tests"
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_child_parent,
        type=Column.INNER,
        id_parent_persistent=c.id_column_parent_persistent_test,
        name="test column child parent",
        time_edit=c.time_edit_test + timedelta(seconds=20),
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def column_child_parent(column_child_parent_history):
    return column_objects().get(id=column_child_parent_history.id)


@pytest.fixture
def column_child_parent_child_history(user):
    "Another shared child column for tests"
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=c.id_column_persistent_child_parent_child,
        type=Column.FLOAT,
        id_parent_persistent=c.id_column_persistent_child_parent,
        name="test column child parent",
        time_edit=c.time_edit_test + timedelta(seconds=30),
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def column_child_parent_child(column_child_parent_child_history):
    return column_objects().get(id=column_child_parent_child_history.id)


@pytest.fixture
def column_curated(user):
    "A curated column for tests"
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_curated_test,
        type=Column.BOOL,
        name=c.name_column_curated_test,
        time_edit=c.time_edit_test + timedelta(minutes=4),
        curated=True,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def ownership_request_user(column_user, user1):
    return OwnershipRequest.objects.create(  # pylint: disable=no-member
        id_column_persistent=column_user.id_persistent,
        petitioner=column_user.owner,
        receiver=user1,
        id_persistent=c.id_ownership_request_test,
    )


@pytest.fixture
def ownership_request_curated(column_curated, user, user_commissioner):
    return OwnershipRequest.objects.create(  # pylint: disable=no-member
        id_column_persistent=column_curated.id_persistent,
        petitioner=user_commissioner,
        receiver=user,
        id_persistent=c.id_ownership_request_curated_test,
    )


@pytest.fixture
def ownership_request_curated_editor(column_curated, user, user_editor):
    return OwnershipRequest.objects.create(  # pylint: disable=no-member
        id_column_persistent=column_curated.id_persistent,
        receiver=user,
        petitioner=user_editor,
        id_persistent=c.id_ownership_request_curated_test,
    )
