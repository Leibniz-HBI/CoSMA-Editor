# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

from cosmae.column.models_django import column_objects


def test_unresolvable(merge_request_user, conflict_resolution_replace0, user):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_resolvable(merge_request_user, conflict_resolution_user, user):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 0


def test_resolvable_commissioner(
    merge_request_user, conflict_resolution_replace0, user_commissioner
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 0


def test_unresolvable_commissioner(
    merge_request_user, conflict_resolution_user, user_commissioner
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_non_change_entity_origin_user(
    merge_request_user, origin_entity_for_mr_changed, conflict_resolution_replace0, user
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_change_entity_origin_commissioner(
    merge_request_user,
    origin_entity_for_mr_changed,
    conflict_resolution_replace0,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 1


def test_change_entity_destination_user(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace0,
    user,
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_non_change_entity_destination_user_commissioner(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace0,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 1


def test_change_definition_user(
    merge_request_user, column_for_mr_changed, conflict_resolution_user, user
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 1


def test_change_definition_user_commissioner(
    merge_request_user,
    column_for_mr_changed,
    conflict_resolution_user,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_change_definition_owner_user(
    merge_request_user, column_for_mr_changed_owner, conflict_resolution_user, user
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_change_definition_owner_user_commissioner(
    merge_request_user,
    column_for_mr_changed_owner,
    conflict_resolution_user,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 1


def test_change_instance_destination_user(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed1,
    conflict_resolution_keep1,
    user,
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_non_change_instance_destination_user_commissioner(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed1,
    conflict_resolution_keep1,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 1


def test_change_instance_origin_user(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_keep1,
    user,
):
    columns = column_objects().for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 1
    assert len(updated) == 0


def test_change_instance_origin_user_commissioner(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_keep1,
    user_commissioner,
):
    columns = column_objects().for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.conflicts_unresolvable_updated(columns)
    assert len(resolvable) == 1
    assert len(unresolvable) == 0
    assert len(updated) == 1
