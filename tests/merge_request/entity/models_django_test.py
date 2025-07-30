# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from datetime import datetime, timezone

from cosmae.column.models_django import ColumnHistory, column_objects
from cosmae.merge_request.entity.models_django import EntityConflictResolution


def test_no_change_user(merge_request_user, conflict_resolution_replace, user):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_no_change_user1(merge_request_user, conflict_resolution_replace, user1):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_no_change_user_commissioner(
    merge_request_user, conflict_resolution_replace, user_commissioner
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_includes_no_value_at_destination(
    merge_request_user, instances_merge_request_origin_user
):
    conflicts = list(merge_request_user.instance_conflicts_all())
    assert len(conflicts) == 3


def test_non_change_entity_origin_user(
    merge_request_user, origin_entity_for_mr_changed, conflict_resolution_replace, user
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_non_change_entity_origin_user1(
    merge_request_user, origin_entity_for_mr_changed, conflict_resolution_replace, user1
):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_non_change_entity_origin_user_commissioner(
    merge_request_user,
    origin_entity_for_mr_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_non_change_entity_destination_user(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
    user,
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_non_change_entity_destination_user1(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
    user1,
):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_non_change_entity_destination_user_commissioner(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_user(
    merge_request_user, column_for_mr_changed, conflict_resolution_replace, user
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_user1(
    merge_request_user, column_for_mr_changed, conflict_resolution_replace, user1
):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_change_definition_user_commissioner(
    merge_request_user,
    column_for_mr_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_owner_user(
    merge_request_user, column_for_mr_changed_owner, conflict_resolution_replace, user
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_owner_user1(
    merge_request_user, column_for_mr_changed_owner, conflict_resolution_replace, user1
):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 0
    assert len(unresolvable) == 3
    assert len(updated) == 0


def test_change_definition_owner_user_commissioner(
    merge_request_user,
    column_for_mr_changed_owner,
    conflict_resolution_replace,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 2
    assert len(unresolvable) == 1
    assert len(updated) == 1


def test_change_instance_destination_user(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
    user,
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_instance_destination_user1(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
    user1,
):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_non_change_instance_destination_user_commissioner(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_instance_origin_user(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
    user,
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_instance_origin_user1(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
    user1,
):
    columns = column_objects().for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_change_instance_origin_user_commissioner(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_all(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
):
    old_column = conflict_resolution_replace.column
    ColumnHistory.change_or_create_versioned(
        id_persistent=old_column.id_persistent,
        time_edit=datetime(1912, 4, 7, tzinfo=timezone.utc),
        name="edited column",
        version=old_column.id,
        owner_id=old_column.owner.id,
        written_by_session=old_column.owner.edit_session,
    )[0].save()

    recent = EntityConflictResolution.only_recent()
    assert len(recent) == 0
