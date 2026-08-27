# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments

from django.db import models

from cosmae.column.models_django import Column
from cosmae.entity.models_django import Entity
from cosmae.justification.models_django import EntityJustification
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution,
    EntityMergeRequest,
)
from cosmae.merge_request.entity.queue import (
    apply_entity_merge_request,
    merge_request_compute_conflicts,
)
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.value.models_django import Value, value_objects
from tests.merge_request.entity import common as c


def test_creates_column_merge_requests(conflict_resolution_unresolved0, user):
    "Make sure a column merge request is created for an unresolved conflict"
    merge_request = conflict_resolution_unresolved0.merge_request
    merge_request.state = EntityMergeRequest.State.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 1
    columns_including_hidden = Column.query_set(include_hidden=True)
    assert len(columns_including_hidden) == 4
    assert len(Column.query_set()) == 3
    hidden_column_instances = (
        Value.objects.all()  # pylint: disable=no-member
        .annotate(
            column_hidden=models.Subquery(
                columns_including_hidden.filter(
                    id_persistent=models.OuterRef("id_column_persistent")
                ).values("hidden")
            )
        )
        .filter(column_hidden=True)
    )
    assert len(hidden_column_instances) == 1


def test_applies_resolution_empty_destination(
    conflict_resolution_replace_empty_destination, user1
):
    "Make sure that the resolution is applied correctly when the destination value is empty"
    resolution = conflict_resolution_replace_empty_destination
    merge_request = resolution.merge_request
    merge_request.state = EntityMergeRequest.State.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    assert most_recent.merged_from == c.id_entity_origin_persistent
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 0
    columns_including_hidden = Column.query_set(include_hidden=True)
    assert len(columns_including_hidden) == 4
    assert len(Column.query_set()) == 4
    value = (
        value_objects()
        .filter(
            id_entity_persistent=resolution.entity_destination.id_persistent,
            id_column_persistent=resolution.column.id_persistent,
        )
        .get()
    )
    assert value.value == c.value_origin1


def test_applies_resolutions(conflict_resolution_replace0, user1):
    merge_request = conflict_resolution_replace0.merge_request
    merge_request.state = EntityMergeRequest.State.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.merged_from == c.id_entity_origin_persistent
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 0
    assert len(Column.query_set(include_hidden=True)) == 3
    assert len(Column.query_set()) == 3


def test_applies_resolution_replacement_value(
    conflict_resolution_replacement_value, user1
):
    resolution = conflict_resolution_replacement_value
    merge_request = resolution.merge_request
    merge_request.state = EntityMergeRequest.State.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.merged_from == c.id_entity_origin_persistent
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 0
    assert len(Column.query_set(include_hidden=True)) == 3
    assert len(Column.query_set()) == 3
    value = (
        value_objects()
        .filter(
            id_entity_persistent=resolution.entity_destination.id_persistent,
            id_column_persistent=resolution.column.id_persistent,
        )
        .get()
    )
    assert value.value == c.replacement_value


def test_copies_justification(conflict_resolution_replace0, user_commissioner):
    merge_request = conflict_resolution_replace0.merge_request
    merge_request.state = EntityMergeRequest.State.RESOLVED
    merge_request.save()
    time = c.time_merge_request
    EntityJustification.add(
        "c2e4a59f-036b-4153-b543-e464912ddf1f",
        merge_request.id_origin_persistent,
        "justification",
        time,
        merge_request.created_by,
    )
    EntityJustification.add(
        "31f580af-a975-4612-b203-3aacfb2b04dc",
        merge_request.id_origin_persistent,
        "another justification",
        time,
        merge_request.created_by,
    )
    apply_entity_merge_request(
        merge_request.id_persistent, user_commissioner.id_persistent
    )
    assert (
        len(
            EntityJustification.for_id_entity_persistent_unordered(
                merge_request.id_destination_persistent
            )
        )
        == 2
    )


def test_creates_column_merge_request_for_updated(
    conflict_resolution_keep1,
    user1,
    instance_merge_request_destination_user_conflict_changed1,
):
    merge_request = conflict_resolution_keep1.merge_request
    merge_request.state = EntityMergeRequest.State.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = list(
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 1
    columns_including_hidden = Column.query_set(include_hidden=True)
    assert len(columns_including_hidden) == 4
    assert len(Column.query_set()) == 3
    hidden_column_instances = (
        Value.objects.all()  # pylint: disable=no-member
        .annotate(
            column_hidden=models.Subquery(
                columns_including_hidden.filter(
                    id_persistent=models.OuterRef("id_column_persistent")
                ).values("hidden")
            )
        )
        .filter(column_hidden=True)
    )
    assert len(hidden_column_instances) == 1


def test_does_not_update_known_conflicts(
    merge_request_user_conflicts, conflict_resolution_keep1, user1
):
    merge_request_compute_conflicts(merge_request_user_conflicts.id_persistent)
    resolutions = list(EntityConflictResolution.objects.all().order_by("id"))
    assert len(resolutions) == 3
    assert resolutions[0].id == conflict_resolution_keep1.id
    assert resolutions[0].replacement_state == EntityConflictResolution.KEEP
    # empty destination values
    assert resolutions[1].replacement_state == EntityConflictResolution.REPLACE
    assert resolutions[2].replacement_state == EntityConflictResolution.REPLACE


def test_does_update_changed_destination_value(
    merge_request_user_conflicts,
    conflict_resolution_keep1,
    user1,
    instance_merge_request_destination_user_conflict_changed1,
):
    merge_request_compute_conflicts(merge_request_user_conflicts.id_persistent)
    resolutions = list(EntityConflictResolution.objects.all().order_by("id"))
    assert len(resolutions) == 3
    assert resolutions[0].id > conflict_resolution_keep1.id
    assert resolutions[0].replacement_state == EntityConflictResolution.REPLACE
    assert resolutions[1].id > conflict_resolution_keep1.id
    assert resolutions[1].replacement_state is None
    assert (
        resolutions[1].value_destination.id
        == instance_merge_request_destination_user_conflict_changed1.id
    )
    assert resolutions[2].id > conflict_resolution_keep1.id
    assert resolutions[2].replacement_state == EntityConflictResolution.REPLACE


def test_does_update_changed_origin_value(
    merge_request_user_conflicts,
    conflict_resolution_keep1,
    user1,
    value_curated_updated1,
):
    merge_request_compute_conflicts(merge_request_user_conflicts.id_persistent)
    resolutions = list(EntityConflictResolution.objects.all().order_by("id"))
    assert len(resolutions) == 3
    assert resolutions[0].id > conflict_resolution_keep1.id
    assert resolutions[0].replacement_state == EntityConflictResolution.REPLACE
    assert resolutions[1].id > conflict_resolution_keep1.id
    assert resolutions[1].replacement_state == EntityConflictResolution.REPLACE
    assert resolutions[2].id > conflict_resolution_keep1.id
    assert resolutions[2].replacement_state is None
    assert resolutions[2].value_origin.id == value_curated_updated1.id
