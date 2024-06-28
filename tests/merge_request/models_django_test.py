# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from datetime import datetime, timezone

from cosmae.entity.models_django import Entity
from cosmae.merge_request.models_django import TagConflictResolution, TagMergeRequest


def test_created_by_user(user, merge_request_user, merge_request_user1):
    mr = TagMergeRequest.created_by_user(user).get()
    assert str(mr.id_persistent) == str(merge_request_user1.id_persistent)


def test_assigned_to_user(user, merge_request_user, merge_request_user1):
    mr = TagMergeRequest.assigned_to_user(user).get()
    assert str(mr.id_persistent) == str(merge_request_user.id_persistent)


def test_non_recent_no_change(merge_request_user, conflict_resolution_replace):
    non_recent = TagConflictResolution.non_recent()
    assert len(non_recent) == 0


def test_recent_no_change(merge_request_user, conflict_resolution_replace):
    recent = TagConflictResolution.only_recent()
    assert len(recent) == 1


def test_includes_no_value_at_destination(
    merge_request_user, instances_merge_request_origin_user
):
    conflicts = list(merge_request_user.instance_conflicts_all())
    assert len(conflicts) == 2


def test_non_recent_change_entity(
    merge_request_user, entity1_changed, conflict_resolution_replace
):
    non_recent = TagConflictResolution.non_recent()
    assert len(non_recent) == 1


def test_recent_change_entity(
    merge_request_user, entity1_changed, conflict_resolution_replace
):
    recent = TagConflictResolution.only_recent()
    assert len(recent) == 0


def test_recent_change_definition_origin(
    merge_request_user, origin_tag_def_for_mr_changed, conflict_resolution_replace
):
    recent = TagConflictResolution.only_recent()
    assert len(recent) == 0


def test_non_recent_change_definition_origin(
    merge_request_user, origin_tag_def_for_mr_changed, conflict_resolution_replace
):
    recent = TagConflictResolution.non_recent()
    assert len(recent) == 1


def test_recent_change_definition_destination(
    merge_request_user, destination_tag_def_for_mr_changed, conflict_resolution_replace
):
    recent = TagConflictResolution.only_recent()
    assert len(recent) == 0


def test_non_recent_change_definition_destination(
    merge_request_user, destination_tag_def_for_mr_changed, conflict_resolution_replace
):
    recent = TagConflictResolution.non_recent()
    assert len(recent) == 1


def test_recent_change_instance_destination(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
):
    recent = TagConflictResolution.only_recent()
    assert len(recent) == 0


def test_non_recent_change_instance_destination(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
):
    recent = TagConflictResolution.non_recent()
    assert len(recent) == 1


def test_recent_change_instance_origin(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
):
    recent = TagConflictResolution.only_recent()
    assert len(recent) == 0


def test_non_recent_change_instance_origin(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
):
    recent = TagConflictResolution.non_recent()
    assert len(recent) == 1


def test_recent_change_all(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    destination_tag_def_for_mr_changed,
    conflict_resolution_replace,
):
    old_entity = conflict_resolution_replace.entity
    Entity.change_or_create_versioned(
        id_persistent=old_entity.id_persistent,
        time_edit=datetime(1912, 4, 7, tzinfo=timezone.utc),
        display_txt="edited_entity",
        version=old_entity.id,
        written_by_id_persistent=merge_request_user.created_by.id_persistent,
    )[0].save()

    recent = TagConflictResolution.only_recent()
    assert len(recent) == 0


def test_non_recent_change_all(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    destination_tag_def_for_mr_changed,
    entity1_changed,
    conflict_resolution_replace,
):
    recent = TagConflictResolution.non_recent()
    assert len(recent) == 1
