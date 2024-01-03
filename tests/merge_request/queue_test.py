# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

import cosmae.merge_request.queue as q
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagInstance


def test_fast_forward_destination_empty(
    merge_request_user_fast_forward, instances_merge_request_origin_user
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.MERGED


def test_fast_forward_origin_empty(
    merge_request_user_fast_forward, instance_merge_request_destination_user_no_conflict
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.MERGED


def test_fast_forward_no_value(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_no_conflict_fast_forward,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.CONFLICTS


def test_fast_forward_conflict(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict_fast_forward,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.CONFLICTS


def test_fast_forward_no_conflict_same_value(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_same_value1,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.MERGED


def test_applies_resolutions(
    merge_request_user, conflict_resolution_keep, conflict_resolution_replace
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value origin 1"


def test_incomplete_resolution_stays_open_keep(
    merge_request_user, conflict_resolution_keep
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.OPEN
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value destination"


def test_incomplete_resolution_stays_open_replace(
    merge_request_user, conflict_resolution_replace
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.OPEN
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value destination"


def test_merges_for_equal_value_replace(
    merge_request_user, conflict_resolution_replace, instance_destination_same_value
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user.id_destination_persistent
        )
    )
    assert len(instances) == 2
    instance = instances[0]
    assert instance.value == "value origin"
    instance = instances[1]
    assert instance.value == "value origin 1"


def test_merges_for_equal_value_keep(
    merge_request_user,
    conflict_resolution_keep,
    instance_merge_request_destination_user_same_value1,
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == instance_merge_request_destination_user_same_value1.value


def test_merges_for_equal_value_updated(
    merge_request_user, instance_destination_updated_same_value1
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value origin 1"


def test_instance_changed(
    merge_request_user,
    conflict_resolution_replace,
    instance_merge_request_origin_user_changed,
):
    q.merge_request_resolve_conflicts(merge_request_user.id_persistent)
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user.id_persistent, merge_request_user.assigned_to
    )
    assert merge_request.state == TagMergeRequest.OPEN
