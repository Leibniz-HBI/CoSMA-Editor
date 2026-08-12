# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

from pytest import fixture

import cosmae.merge_request.queue as q
import tests.merge_request.common as c
from cosmae.column.models_django import Column
from cosmae.merge_request.models_django import (
    ColumnConflictResolution,
    ColumnMergeRequest,
)
from cosmae.value.models_django import Value


@fixture
def mock_enqueue(mocker):
    "Mock the queue functions"
    mock_enqueue = mocker.MagicMock()
    mocker.patch("cosmae.merge_request.queue.enqueue", mock_enqueue)
    return mock_enqueue


def test_compute_conflicts_destination_empty(
    mock_enqueue, merge_request_user_fast_forward, instances_merge_request_origin_user
):
    "Fast forward a merge request for an empty destination"
    q.merge_request_compute_conflicts(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.CONFLICTS
    mock_enqueue.assert_called_once_with(
        q.merge_request_compute_conflicts,
        args=(
            str(merge_request_user_fast_forward.id_persistent),
            instances_merge_request_origin_user[1].id + 1,
            30,
            True,
        ),
        job_timeout=60 * 12,
    )
    conflicts = list(
        ColumnConflictResolution.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request_user_fast_forward
        )
    )
    for conflict in conflicts:
        assert conflict.replacement_state == ColumnConflictResolution.REPLACE


def test_compute_conflicts_origin_empty(
    merge_request_user_fast_forward, instance_merge_request_destination_user_no_conflict
):
    "Fast forward a merge request if the origin column has no data."
    q.merge_request_compute_conflicts(merge_request_user_fast_forward.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.RESOLVED


def test_compute_conflict_same_value(
    merge_request_user_conflicts,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_same_value1,
):
    "Does fast forward for same value."
    q.merge_request_compute_conflicts(merge_request_user_conflicts.id_persistent)
    merge_request_after = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.created_by,
    )
    assert merge_request_after.state == ColumnMergeRequest.State.CONFLICTS
    conflicts = ColumnConflictResolution.objects.filter(  # pylint: disable=no-member
        merge_request=merge_request_user_conflicts
    )
    assert len(conflicts) == 1
    assert conflicts[0].replacement_state == ColumnConflictResolution.REPLACE
    assert conflicts[0].value_origin.id == instances_merge_request_origin_user[0].id


def test_applies_resolutions(
    merge_request_user_resolved, conflict_resolutions_replace_replace
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
    assert len(instances) == 2
    instances = sorted(instances, key=lambda x: x.id)
    instance = instances[0]
    assert instance.merged_from == c.id_instance_origin
    assert instance.value == "value origin"
    instance = instances[1]
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
    merge_request_user_conflicts,
    instances_merge_request_origin_user,
    conflict_resolution_keep,
    mock_enqueue,
):
    """The merge request should stay open if not all conflicts are resolved.
    This is the case for an existing keep resolution."""
    q.merge_request_compute_conflicts(
        merge_request_user_conflicts.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.CONFLICTS
    resolutions = list(
        ColumnConflictResolution.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request_user_conflicts
        )
    )
    assert len(resolutions) == 2
    resolutions = sorted(resolutions, key=lambda x: x.id)
    assert resolutions[0].replacement_state == ColumnConflictResolution.KEEP
    assert resolutions[1].replacement_state == ColumnConflictResolution.REPLACE
    mock_enqueue.assert_called_once_with(
        q.merge_request_compute_conflicts,
        args=(
            str(merge_request_user_conflicts.id_persistent),
            instances_merge_request_origin_user[1].id + 1,
            30,
            True,
        ),
        job_timeout=60 * 12,
    )


def test_incomplete_resolution(
    merge_request_user_conflicts,
    instances_merge_request_origin_user,
    conflict_resolution_replace1,
    mock_enqueue,
):
    """The merge request should stay open if not all conflicts are resolved.
    This is the case for an existing replace resolution."""
    q.merge_request_compute_conflicts(
        merge_request_user_conflicts.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.CONFLICTS
    resolutions = list(
        ColumnConflictResolution.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request_user_conflicts
        )
    )
    assert len(resolutions) == 2
    resolutions = sorted(resolutions, key=lambda x: x.id)
    assert resolutions[0].replacement_state == ColumnConflictResolution.REPLACE
    assert resolutions[1].replacement_state == ColumnConflictResolution.REPLACE
    mock_enqueue.assert_called_once_with(
        q.merge_request_compute_conflicts,
        args=(
            str(merge_request_user_conflicts.id_persistent),
            instances_merge_request_origin_user[0].id + 1,
            30,
            True,
        ),
        job_timeout=60 * 12,
    )


def test_merges_for_equal_value_replace(
    merge_request_user_resolved,
    conflict_resolution_replace1,
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
    assert len(instances) == 2
    instances = sorted(instances, key=lambda x: x.id)
    instance = instances[1]
    assert instance.id == instance_merge_request_destination_user_same_value1.id


def test_no_conflict_for_equal_value_updated(
    merge_request_user_conflicts,
    instances_merge_request_origin_user,
    instance_destination_updated_same_value1,
    mock_enqueue,
):
    """Should merge if an update leads to equal value"""
    q.merge_request_compute_conflicts(
        merge_request_user_conflicts.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.CONFLICTS
    instances = list(
        Value.objects.filter(  # pylint: disable=no-member
            id_column_persistent=merge_request_user_conflicts.id_destination_persistent
        )
    )
    assert len(instances) == 1
    instance = instances[0]
    assert instance.value == "value origin 1"


def test_instance_changed(
    mock_enqueue,
    merge_request_user_conflicts,
    conflict_resolution_replace1,
    instance_merge_request_origin_user_changed,
):
    "Merge request should stay open when the instance has changed to a different value."
    q.merge_request_compute_conflicts(
        merge_request_user_conflicts.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.CONFLICTS
    mock_enqueue.assert_called_once_with(
        q.merge_request_compute_conflicts,
        args=(
            str(merge_request_user_conflicts.id_persistent),
            instance_merge_request_origin_user_changed.id + 1,
            30,
            True,
        ),
        job_timeout=60 * 12,
    )


def test_resolves_when_no_resolution_needed(
    mock_enqueue,
    merge_request_user_conflicts,
):
    "Merge request should be resolved when no resolution is needed."
    q.merge_request_compute_conflicts(
        merge_request_user_conflicts.id_persistent,
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.RESOLVED
    mock_enqueue.assert_not_called()


def test_open_when_resolution_needed(
    mock_enqueue,
    merge_request_user_conflicts,
):
    "Merge request should be open when a resolution is needed."
    q.merge_request_compute_conflicts(
        merge_request_user_conflicts.id_persistent, 0, 30, True
    )
    merge_request = ColumnMergeRequest.by_id_persistent(
        merge_request_user_conflicts.id_persistent,
        merge_request_user_conflicts.assigned_to,
    )
    assert merge_request.state == ColumnMergeRequest.State.OPEN
    mock_enqueue.assert_not_called()
