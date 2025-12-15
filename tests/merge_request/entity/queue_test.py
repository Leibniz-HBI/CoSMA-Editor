# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments

from django.db import models

from cosmae.column.models_django import Column
from cosmae.entity.models_django import Entity
from cosmae.justification.models_django import EntityJustification
from cosmae.merge_request.entity.models_django import EntityMergeRequest
from cosmae.merge_request.entity.queue import apply_entity_merge_request
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.value.models_django import Value
from tests.merge_request.entity import common as c


def test_creates_column_merge_requests(conflict_resolution_replace):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    user = merge_request.created_by
    apply_entity_merge_request(merge_request.id_persistent, user.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 2
    assert len({mr.id_destination_persistent for mr in column_merge_requests}) == 2
    for mr in column_merge_requests:
        assert mr.disable_origin_on_merge
    columns_including_hidden = Column.query_set(include_hidden=True)
    assert len(columns_including_hidden) == 5
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
    assert len(hidden_column_instances) == 2


def test_creates_column_merge_requests_empty_destination(
    conflict_resolution_replace_empty_destination,
):
    merge_request = conflict_resolution_replace_empty_destination.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    user = merge_request.created_by
    apply_entity_merge_request(merge_request.id_persistent, user.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 2
    assert len({mr.id_destination_persistent for mr in column_merge_requests}) == 2
    for mr in column_merge_requests:
        assert mr.disable_origin_on_merge
    columns_including_hidden = Column.query_set(include_hidden=True)
    assert len(columns_including_hidden) == 5
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
    assert len(hidden_column_instances) == 2


def test_applies_resolutions(conflict_resolution_replace, user1):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.merged_from == c.id_entity_origin_persistent
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 2
    assert len({mr.id_destination_persistent for mr in column_merge_requests}) == 2
    assert len(Column.query_set(include_hidden=True)) == 5
    assert len(Column.query_set()) == 3


def test_applies_resolution_replacement_value(
    conflict_resolution_replacement_value, user1
):
    merge_request = conflict_resolution_replacement_value.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.merged_from == c.id_entity_origin_persistent
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 2
    assert len({mr.id_destination_persistent for mr in column_merge_requests}) == 2
    assert len(Column.query_set(include_hidden=True)) == 5
    assert len(Column.query_set()) == 3


def test_copies_justification(conflict_resolution_replace, user1):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
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
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    assert (
        len(
            EntityJustification.for_id_entity_persistent_unordered(
                merge_request.id_destination_persistent
            )
        )
        == 2
    )


def test_creates_column_merge_request_for_updated(
    conflict_resolution_replace,
    user1,
    instance_merge_request_destination_user_conflict_changed,
):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.objects.exclude_disabled().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    column_merge_requests = (
        ColumnMergeRequest.objects.all()
    )  # pylint: disable=no-member
    assert len(column_merge_requests) == 3
    assert len({mr.id_destination_persistent for mr in column_merge_requests}) == 3
    columns_including_hidden = Column.query_set(include_hidden=True)
    assert len(columns_including_hidden) == 6
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
    assert len(hidden_column_instances) == 3
