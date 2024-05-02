# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from datetime import datetime

from cosmae.merge_request.entity.models_django import EntityConflictResolution
from cosmae.tag.models_django import TagDefinition, TagDefinitionHistory


def test_no_change_user(merge_request_user, conflict_resolution_replace, user):
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_no_change_user1(merge_request_user, conflict_resolution_replace, user1):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_no_change_user_commissioner(
    merge_request_user, conflict_resolution_replace, user_commissioner
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
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
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_non_change_entity_origin_user1(
    merge_request_user, origin_entity_for_mr_changed, conflict_resolution_replace, user1
):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_non_change_entity_origin_user_commissioner(
    merge_request_user,
    origin_entity_for_mr_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_non_change_entity_destination_user(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
    user,
):
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_non_change_entity_destination_user1(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
    user1,
):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_non_change_entity_destination_user_commissioner(
    merge_request_user,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_user(
    merge_request_user, tag_def_for_mr_changed, conflict_resolution_replace, user
):
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_user1(
    merge_request_user, tag_def_for_mr_changed, conflict_resolution_replace, user1
):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_change_definition_user_commissioner(
    merge_request_user,
    tag_def_for_mr_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_owner_user(
    merge_request_user, tag_def_for_mr_changed_owner, conflict_resolution_replace, user
):
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_definition_owner_user1(
    merge_request_user, tag_def_for_mr_changed_owner, conflict_resolution_replace, user1
):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 0
    assert len(unresolvable) == 3
    assert len(updated) == 0


def test_change_definition_owner_user_commissioner(
    merge_request_user,
    tag_def_for_mr_changed_owner,
    conflict_resolution_replace,
    user_commissioner,
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 2
    assert len(unresolvable) == 1
    assert len(updated) == 1


def test_change_instance_destination_user(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
    user,
):
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_instance_destination_user1(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
    user1,
):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_non_change_instance_destination_user_commissioner(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_instance_origin_user(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
    user,
):
    tag_definitions = TagDefinition.for_user(user)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_instance_origin_user1(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
    user1,
):
    tag_definitions = TagDefinition.for_user(user1)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 1


def test_change_instance_origin_user_commissioner(
    merge_request_user,
    instance_merge_request_origin_user_changed,
    conflict_resolution_replace,
    user_commissioner,
):
    tag_definitions = TagDefinition.for_user(user_commissioner, True)
    (
        resolvable,
        unresolvable,
        updated,
    ) = merge_request_user.resolvable_unresolvable_updated(tag_definitions)
    assert len(resolvable) == 1
    assert len(unresolvable) == 2
    assert len(updated) == 0


def test_change_all(
    merge_request_user,
    instance_merge_request_destination_user_conflict_changed,
    destination_entity_for_mr_changed,
    conflict_resolution_replace,
):
    old_tag_def = conflict_resolution_replace.tag_definition
    TagDefinitionHistory.change_or_create_versioned(
        id_persistent=old_tag_def.id_persistent,
        time_edit=datetime(1912, 4, 7),
        name="edited tag definition",
        version=old_tag_def.id,
        owner_id=old_tag_def.owner.id,
        written_by_id_persistent=old_tag_def.owner.id_persistent,
    )[0].save()

    recent = EntityConflictResolution.only_recent()
    assert len(recent) == 0
