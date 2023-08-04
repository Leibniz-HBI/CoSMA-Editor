# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import cosmae.merge_request.queue as q
from cosmae.merge_request.models_django import MergeRequest


def test_fast_forward_destination_empty(
    merge_request_user_fast_forward, instances_merge_request_origin_user
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = MergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == MergeRequest.MERGED


def test_fast_forward_origin_empty(
    merge_request_user_fast_forward, instance_merge_request_destination_user_no_conflict
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = MergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == MergeRequest.MERGED


def test_fast_forward_no_value(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_no_conflict_fast_forward,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = MergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == MergeRequest.CONFLICTS


def test_fast_forward_conflict(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict_fast_forward,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = MergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == MergeRequest.CONFLICTS


def test_fast_forward_no_conflict_same_value(
    merge_request_user_fast_forward,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_same_value,
):
    q.merge_request_fast_forward(merge_request_user_fast_forward.id_persistent)
    merge_request_after = MergeRequest.by_id_persistent(
        merge_request_user_fast_forward.id_persistent,
        merge_request_user_fast_forward.created_by,
    )
    assert merge_request_after.state == MergeRequest.MERGED
