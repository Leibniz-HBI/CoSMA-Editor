# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

import cosmae.merge_request.queue as q
import tests.merge_request.common as c
from cosmae.column.models_django import Column
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.value.models_django import Value


def test_fast_forward_destination_empty(
    merge_request_user_fast_forward, instances_merge_request_origin_user
):
    "Fast forward a merge request for an empty destination"
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.MERGED
    assert not Column.most_recent_by_id(
        merge_request_user_fast_forward.id_origin_persistent
    ).disabled


def test_fast_forward_destination_empty_with_disable(
    merge_request_user_fast_forward_disable_origin, instances_merge_request_origin_user
):
    "Disables the origin column on fast forward of a merge request."
    q.merge_request_fast_forward(
        merge_request_user_fast_forward_disable_origin.id_persistent
    )
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward_disable_origin.id_persistent,
        merge_request_user_fast_forward_disable_origin.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.MERGED
    assert Column.most_recent_by_id(
        merge_request_user_fast_forward_disable_origin.id_origin_persistent
    ).disabled


def test_fast_forward_origin_empty(
    merge_request_user_fast_forward, instance_merge_request_destination_user_no_conflict
):
    "Fast forward a merge request if the origin column has no data."
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.MERGED


def test_fast_forward_no_value(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_no_conflict_fast_forward,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.CONFLICTS


def test_fast_forward_conflict(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict_fast_forward,
):
    "Does not fast forward on conflict."
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.CONFLICTS


def test_fast_forward_no_conflict_same_value(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_same_value1,
):
    "Does fast forward for same value."
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.MERGED


def test_applies_resolutions(
    merge_request_user_resolved, conflict_resolution_keep, conflict_resolution_replace
):
    "Test the application of a resolution."

    q.merge_request_resolve_conflicts(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.MERGED
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_resolved.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.merged_from == c.id_instance_origin1
    assert instance.value == "value origin 1"


def test_applies_resolutions_disable_origin(merge_request_user_disable_origin_resolved):
    """Test disable origin column on application of resolutions.
    This test does not apply any resolutions."""
    q.merge_request_resolve_conflicts(
        merge_request_user_disable_origin_resolved.id_persistent,
        merge_request_user_disable_origin_resolved.assigned_to.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_disable_origin_resolved.id_persistent,
        merge_request_user_disable_origin_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.MERGED
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=(
                merge_request_user_disable_origin_resolved.id_destination_persistent
            )
        )
    )
    assert len(instances) == 0
    assert Column.most_recent_by_id(
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
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.OPEN
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_resolved.id_destination_persistent
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
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.OPEN
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_resolved.id_destination_persistent
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
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.MERGED
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_resolved.id_destination_persistent
        ).order_by("id_persistent")
    )
    assert instances[0].merged_from is None
    assert instances[1].merged_from == c.id_instance_origin1
    assert len(instances) == 2
    assert instances[0].value == "value origin"
    assert instances[1].value == "value origin 1"


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
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.MERGED
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_resolved.id_destination_persistent
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
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.MERGED
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_resolved.id_destination_persistent
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
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_resolved.id_persistent,
        merge_request_user_resolved.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.OPEN
