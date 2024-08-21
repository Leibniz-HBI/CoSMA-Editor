# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

import tests.merge_request.common as c
import cosmae.merge_request.queue as q
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance


def test_fast_forward_destination_empty(
    merge_request_user_fast_forward, instances_merge_request_origin_user
):
    "Fast forward a merge request for an empty destination"
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.MERGED
    assert not TagDefinition.most_recent_by_id(
        merge_request_user_fast_forward.id_origin_persistent
    ).disabled


def test_fast_forward_destination_empty_with_disable(
    merge_request_user_fast_forward_disable_origin, instances_merge_request_origin_user
):
    "Disables the origin tag def on fast forward of a merge request."
    q.merge_request_fast_forward(
        merge_request_user_fast_forward_disable_origin.id_persistent
    )
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward_disable_origin.id_persistent,
        merge_request_user_fast_forward_disable_origin.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.MERGED
    assert TagDefinition.most_recent_by_id(
        merge_request_user_fast_forward_disable_origin.id_origin_persistent
    ).disabled


def test_fast_forward_origin_empty(
    merge_request_user_fast_forward, instance_merge_request_destination_user_no_conflict
):
    "Fast forward a merge request if the origin tag has no data."
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
    "Does not fast forward on conflict."
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
    "Does fast forward for same value."
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = TagMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == TagMergeRequest.MERGED


def test_applies_resolutions(
    merge_request_user_resolved, conflict_resolution_keep, conflict_resolution_replace
):
    "Test the application of a resolution."

    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.merged_from == c.id_instance_origin1
    assert instance.value == "value origin 1"


def test_applies_resolutions_disable_origin(merge_request_user_disable_origin_resolved):
    """Test disable origin tag on application of resolutions.
    This test does not apply any resolutions."""
    q.merge_request_resolve_conflicts(
        merge_request_user_disable_origin_resolved.id_persistent,
        merge_request_user_disable_origin_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_disable_origin_resolved.id_persistent,
        merge_request_user_disable_origin_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=(
                merge_request_user_disable_origin_resolved.id_destination_persistent
            )
        )
    )
    assert len(instances) == 0
    assert TagDefinition.most_recent_by_id(
        merge_request_user_disable_origin_resolved.id_origin_persistent
    ).disabled


def test_incomplete_resolution_stays_open_keep(
    merge_request_user_resolved, conflict_resolution_keep
):
    """The merge request should stay open if not all conflicts are resolved.
    This is the case for an existing keep resolution."""
    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.OPEN
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value destination"


def test_incomplete_resolution_stays_open_replace(
    merge_request_user_resolved, conflict_resolution_replace
):
    """The merge request should stay open if not all conflicts are resolved.
    This is the case for an existing replace resolution."""
    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.OPEN
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value destination"


def test_merges_for_equal_value_replace(
    merge_request_user_resolved,
    conflict_resolution_replace,
    instance_destination_same_value,
):
    """Assert that a merge is performed if an unresolved conflict has equal values.
    This is the case where another conflict is resolved by replace"""
    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert instances[1].merged_from == c.id_instance_origin1
    assert len(instances) == 2
    instance_values = sorted([inst.value for inst in instances])
    assert instance_values[0] == "value origin"
    assert instance_values[1] == "value origin 1"


def test_merges_for_equal_value_keep(
    merge_request_user_resolved,
    conflict_resolution_keep,
    instance_merge_request_destination_user_same_value1,
):
    """Assert that a merge is performed if an unresolved conflict has equal values.
    This is the case where another conflict is resolved by keep"""
    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == instance_merge_request_destination_user_same_value1.value


def test_merges_for_equal_value_updated(
    merge_request_user_resolved, instance_destination_updated_same_value1
):
    """Should merge if an update leads to equal value"""
    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.MERGED
    instances = list(
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_tag_definition_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value origin 1"


def test_instance_changed(
    merge_request_user_resolved,
    conflict_resolution_replace,
    instance_merge_request_origin_user_changed,
):
    "Merge request should stay open when the instance has changed to a different value."
    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = TagMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == TagMergeRequest.OPEN
