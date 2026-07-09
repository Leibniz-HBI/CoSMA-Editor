# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name
# pylint: disable=invalid-name,unused-argument,too-many-arguments,too-many-locals,too-many-statements
from datetime import datetime, timezone

from cosmae.entity.models_django import EntityHistory
from cosmae.merge_request.models_django import (
    ColumnConflictResolution,
    ColumnMergeRequest,
)
from cosmae.value.models_django import ValueHistory


def test_created_by_user(user, merge_request_user, merge_request_user1):
    mr = ColumnMergeRequest.objects.created_by_user(user).get()
    assert str(mr.id_persistent) == str(merge_request_user1.id_persistent)


def test_assigned_to_user(user, merge_request_user, merge_request_user1):
    mr = ColumnMergeRequest.objects.assigned_to_user(user).get()
    assert str(mr.id_persistent) == str(merge_request_user.id_persistent)


def test_non_recent_no_change(merge_request_user, conflict_resolutions_empty_replace):
    non_recent = ColumnConflictResolution.objects.non_recent()
    assert len(non_recent) == 0


def test_recent_no_change(merge_request_user, conflict_resolutions_empty_replace):
    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 2


def test_includes_no_value_at_destination(
    merge_request_user, instances_merge_request_origin_user
):
    conflicts = list(merge_request_user.compute_instance_conflicts())
    assert len(conflicts) == 2


def test_non_recent_change_entity(
    merge_request_user, entity1_changed, conflict_resolutions_empty_replace
):
    non_recent = ColumnConflictResolution.objects.non_recent()
    assert len(non_recent) == 1


def test_recent_change_entity(
    merge_request_user, entity1_changed, conflict_resolutions_empty_replace
):
    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 1


def test_recent_change_definition_origin(
    merge_request_user, origin_column_for_mr_changed, conflict_resolutions_empty_replace
):
    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 1


def test_non_recent_change_definition_origin(
    merge_request_user, origin_column_for_mr_changed, conflict_resolutions_empty_replace
):
    recent = ColumnConflictResolution.objects.non_recent()
    assert len(recent) == 1


def test_recent_change_definition_destination(
    merge_request_user,
    destination_column_for_mr_changed,
    conflict_resolutions_empty_replace,
):
    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 1


def test_non_recent_change_definition_destination(
    merge_request_user,
    destination_column_for_mr_changed,
    conflict_resolutions_empty_replace,
):
    recent = ColumnConflictResolution.objects.non_recent()
    assert len(recent) == 1


def test_recent_change_instance_destination(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolutions_empty_replace,
):
    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 1


def test_non_recent_change_instance_destination(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolutions_empty_replace,
):
    recent = ColumnConflictResolution.objects.non_recent()
    assert len(recent) == 1


def test_recent_change_instance_origin(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolutions_empty_replace,
):
    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 1


def test_non_recent_change_instance_origin(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolutions_empty_replace,
):
    recent = ColumnConflictResolution.objects.non_recent()
    assert len(recent) == 1


def test_recent_non_recent_change_all(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    destination_column_for_mr_changed,
    conflict_resolutions_empty_replace,
):
    old_entity = conflict_resolutions_empty_replace[1].entity
    EntityHistory.change_or_create_versioned(
        id_persistent=old_entity.id_persistent,
        time_edit=datetime(1912, 4, 7, tzinfo=timezone.utc),
        display_txt="edited_entity",
        version=old_entity.id,
        written_by_session=merge_request_user.created_by.edit_session,
    )[0].save()

    recent = ColumnConflictResolution.objects.only_recent()
    assert len(recent) == 1
    recent = ColumnConflictResolution.objects.non_recent()
    assert len(recent) == 1


def test_value_destination_value_added(  # pylint: disable=too-many-arguments, too-many-positional-arguments
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
    conflict_resolution_replace0,
):
    "Make sure that a new value in the destination column will lead to a non recent resolution"
    ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        column_origin=origin_column_for_mr,
        column_destination=destination_column_for_mr,
        entity=entity1,
        value_origin=instances_merge_request_origin_user[1],
        merge_request=merge_request_user,
        replacement_state=ColumnConflictResolution.REPLACE,
    )
    id_value_destination = str("6a2d619e-afb5-4f21-8b2c-5f607e9511b0")
    time_edit = datetime(1873, 2, 4, tzinfo=timezone.utc)
    value = ValueHistory.objects.create(  # pylint: disable=no-member
        id_column_persistent=destination_column_for_mr.id_persistent,
        id_entity_persistent=entity1.id_persistent,
        id_persistent=id_value_destination,
        value="new value destination test",
        time_edit=time_edit,
        written_by_session=destination_column_for_mr.owner.edit_session,
    )
    conflicts = merge_request_user.compute_instance_conflicts()
    unresolved = list(
        conflicts.unresolved(
            merge_request_user.columnconflictresolution_set.only_recent()
        )
    )
    assert len(unresolved) == 1
    assert unresolved[0].value_destination["id"] == value.id
