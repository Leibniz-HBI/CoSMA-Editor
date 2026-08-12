# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments,too-many-positional-arguments
from datetime import datetime, timezone
from uuid import uuid4

import pytest

import tests.entity.common as ce
import tests.merge_request.common as c
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.merge_request.models_django import (
    ColumnConflictResolution,
    ColumnMergeRequest,
)
from cosmae.value.models_django import (
    ValueHistory,
)


@pytest.fixture
def destination_column_for_mr(db, user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name=c.name_column_destination,
        id_persistent=c.id_persistent_column_destination,
        type=Column.STRING,
        time_edit=c.time_column_destination,
        owner=user,
        written_by_session=user.edit_session,
        approved_by=user,
    )


@pytest.fixture
def destination_column_for_mr_changed(destination_column_for_mr):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=destination_column_for_mr.id_persistent,
        version=destination_column_for_mr.id,
        name="changed column test",
        time_edit=c.time_column_destination_changed,
        written_by_session=destination_column_for_mr.owner.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def destination_column_for_mr_user1(db, user1):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name=c.name_column_destination,
        id_persistent=c.id_persistent_column_destination_fast_forward,
        type=Column.STRING,
        time_edit=c.time_column_destination,
        owner=user1,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
    )


@pytest.fixture
def origin_column_for_mr(db, user1):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name=c.name_column_origin,
        id_persistent=c.id_persistent_column_origin,
        type=Column.STRING,
        time_edit=c.time_column_origin,
        owner=user1,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
    )


@pytest.fixture
def origin_column_for_mr_changed(origin_column_for_mr):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=origin_column_for_mr.id_persistent,
        version=origin_column_for_mr.id,
        name="changed column test",
        time_edit=c.time_column_origin_changed,
        written_by_session=origin_column_for_mr.owner.edit_session,
    )
    column.save()
    return column


@pytest.fixture
def contribution_for_mr(db, user1):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_contribution,
        description=c.description_contribution,
        id_persistent=c.id_persistent_contribution,
        has_header=True,
        created_by=user1,
        file_name="tmp_file.csv",
    )


@pytest.fixture
def merge_request_user_fast_forward(
    db, origin_column_for_mr, destination_column_for_mr_user1, contribution_for_mr
):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_column_for_mr.id_persistent,
        id_destination_persistent=destination_column_for_mr_user1.id_persistent,
        created_by=origin_column_for_mr.owner,
        assigned_to=destination_column_for_mr_user1.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request_fast_forward,
        contribution_candidate=contribution_for_mr,
        state=ColumnMergeRequest.State.CONFLICTS,
    )


@pytest.fixture
def merge_request_user_fast_forward_disable_origin(
    db, origin_column_for_mr, destination_column_for_mr_user1, contribution_for_mr
):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_column_for_mr.id_persistent,
        id_destination_persistent=destination_column_for_mr_user1.id_persistent,
        created_by=origin_column_for_mr.owner,
        assigned_to=destination_column_for_mr_user1.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request_fast_forward,
        contribution_candidate=contribution_for_mr,
        disable_origin_on_merge=True,
    )


@pytest.fixture
def merge_request_user(
    db, origin_column_for_mr, destination_column_for_mr, contribution_for_mr
):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_column_for_mr.id_persistent,
        id_destination_persistent=destination_column_for_mr.id_persistent,
        created_by=origin_column_for_mr.owner,
        assigned_to=destination_column_for_mr.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request,
        contribution_candidate=contribution_for_mr,
        state=ColumnMergeRequest.State.OPEN,
    )


@pytest.fixture
def merge_request_user_conflicts(merge_request_user):
    merge_request_user.state = ColumnMergeRequest.State.CONFLICTS
    merge_request_user.save()
    return merge_request_user


@pytest.fixture
def merge_request_user_resolved(merge_request_user):
    merge_request_user.state = ColumnMergeRequest.State.RESOLVED
    merge_request_user.save()
    return merge_request_user


@pytest.fixture
def merge_request_user_disable_origin(
    db, origin_column_for_mr, destination_column_for_mr, contribution_for_mr
):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_column_for_mr.id_persistent,
        id_destination_persistent=destination_column_for_mr.id_persistent,
        created_by=origin_column_for_mr.owner,
        assigned_to=destination_column_for_mr.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request,
        contribution_candidate=contribution_for_mr,
        disable_origin_on_merge=True,
    )


@pytest.fixture
def merge_request_user_disable_origin_resolved(
    merge_request_user_disable_origin,
):
    merge_request_user_disable_origin.state = ColumnMergeRequest.State.RESOLVED
    merge_request_user_disable_origin.save()
    return merge_request_user_disable_origin


@pytest.fixture
def destination_column_for_mr1(db, user1):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name=c.name_column_destination1,
        id_persistent=c.id_persistent_column_destination1,
        type=ColumnHistory.STRING,
        time_edit=c.time_column_destination1,
        owner=user1,
        written_by_session=user1.edit_session,
        approved_by=user1,
    )


@pytest.fixture
def origin_column_for_mr1(db, user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name=c.name_column_origin1,
        id_persistent=c.id_persistent_column_origin1,
        type=Column.STRING,
        time_edit=c.time_column_origin1,
        owner=user,
        written_by_session=user.edit_session,
        approved_by=user,
    )


@pytest.fixture
def contribution_for_mr1(db, user):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_contribution1,
        description=c.description_contribution1,
        id_persistent=c.id_persistent_contribution1,
        has_header=True,
        created_by=user,
        file_name="tmp_file.csv",
    )


@pytest.fixture
def merge_request_user1(
    db, destination_column_for_mr1, origin_column_for_mr1, contribution_for_mr1
):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_destination_persistent=destination_column_for_mr1.id_persistent,
        id_origin_persistent=origin_column_for_mr1.id_persistent,
        created_by=origin_column_for_mr1.owner,
        assigned_to=destination_column_for_mr1.owner,
        created_at=c.time_merge_request1,
        id_persistent=c.id_persistent_merge_request1,
        contribution_candidate=contribution_for_mr1,
        state=ColumnMergeRequest.State.OPEN,
    )


@pytest.fixture
def merge_request_curated(column_curated, column1, contribution_for_mr):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_destination_persistent=column_curated.id_persistent,
        id_origin_persistent=column1.id_persistent,
        created_by=column1.owner,
        assigned_to=None,
        created_at=c.time_merge_request_curated,
        id_persistent=c.id_persistent_merge_request_curated,
        contribution_candidate=contribution_for_mr,
        state=ColumnMergeRequest.State.OPEN,
    )


@pytest.fixture
def instances_merge_request_origin_user(merge_request_user, entity0, entity1):
    id_column = merge_request_user.id_origin_persistent
    value = ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_column_persistent=id_column,
        value=c.value_origin,
        id_persistent=c.id_instance_origin,
        time_edit=c.time_instance_origin,
        written_by_session=merge_request_user.created_by.edit_session,
        approved_by=merge_request_user.created_by,
    )
    value1 = ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=id_column,
        value=c.value_origin1,
        id_persistent=c.id_instance_origin1,
        time_edit=c.time_instance_origin1,
        written_by_session=merge_request_user.created_by.edit_session,
        approved_by=merge_request_user.created_by,
    )
    return [value, value1]


@pytest.fixture
def instance_merge_request_origin_user_changed(
    user1, instances_merge_request_origin_user
):
    old_value = instances_merge_request_origin_user[1]
    value, _ = ValueHistory.change_or_create_versioned(
        id_entity_persistent=old_value.id_entity_persistent,
        id_column_persistent=old_value.id_column_persistent,
        id_persistent=old_value.id_persistent,
        version=old_value.id,
        written_by_session=user1.edit_session,
        value=9001,
        time_edit=c.time_instance_origin1_changed,
    )
    value.save()
    return value


@pytest.fixture
def instance_merge_request_destination_user_no_conflict(merge_request_user, entity2):
    id_column = merge_request_user.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_2,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
        written_by_session=merge_request_user.assigned_to.edit_session,
        approved_by=merge_request_user.assigned_to.id_persistent,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict0(merge_request_user, entity0):
    id_column = merge_request_user.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
        written_by_session=merge_request_user.assigned_to.edit_session,
        approved_by=merge_request_user.assigned_to.id_persistent,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict1(merge_request_user, entity1):
    id_column = merge_request_user.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination1,
        value=c.value_destination1,
        time_edit=c.time_instance_destination1,
        written_by_session=merge_request_user.assigned_to.edit_session,
        approved_by=merge_request_user.assigned_to.id_persistent,
    )


@pytest.fixture
def instances_merge_request_destination_user_same_value(
    instances_merge_request_origin_user,
):
    instances_destination = []
    for instance_origin in instances_merge_request_origin_user:
        instance_destination = ValueHistory(
            id_entity_persistent=instance_origin.id_entity_persistent,
            id_column_persistent=destination_column_for_mr.id_persistent,
            id_persistent=str(uuid4()),
            value=instance_origin.value,
            time_edit=datetime(1994, 12, 2, tzinfo=timezone.utc),
        )
        instance_destination.save()
        instances_destination.append(instance_destination)
    return instances_destination


@pytest.fixture
def resolution_empty_0(
    entity0, merge_request_user, instances_merge_request_origin_user
):
    column_origin = (
        ColumnHistory.objects.by_id_persistent(merge_request_user.id_origin_persistent)
        .order_by("-id")[:1]
        .get()
    )
    column_destination = (
        ColumnHistory.objects.by_id_persistent(
            merge_request_user.id_destination_persistent
        )
        .order_by("-id")[:1]
        .get()
    )
    return ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity0,
        column_origin=column_origin,
        column_destination=column_destination,
        merge_request=merge_request_user,
        value_origin=instances_merge_request_origin_user[0],
        value_destination=None,
    )


@pytest.fixture
def resolutions_empty(
    entity1,
    merge_request_user,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict1,
    resolution_empty_0,
):
    res1 = ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity1,
        column_origin=resolution_empty_0.column_origin,
        column_destination=resolution_empty_0.column_destination,
        merge_request=merge_request_user,
        value_origin=instances_merge_request_origin_user[1],
        value_destination=instance_merge_request_destination_user_conflict1,
    )
    return [resolution_empty_0, res1]


@pytest.fixture
def instance_merge_request_destination_user_conflict_changed(
    user,
    instance_merge_request_destination_user_conflict1,
):
    value, _ = ValueHistory.change_or_create_versioned(
        id_entity_persistent=instance_merge_request_destination_user_conflict1.id_entity_persistent,
        id_column_persistent=(
            instance_merge_request_destination_user_conflict1.id_column_persistent
        ),
        id_persistent=instance_merge_request_destination_user_conflict1.id_persistent,
        version=instance_merge_request_destination_user_conflict1.id,
        written_by_session=user.edit_session,
        value=9001,
        time_edit=c.time_instance_destination_changed,
    )
    value.save()
    return value


@pytest.fixture
def instance_merge_request_destination_user_conflict_fast_forward(
    merge_request_user_fast_forward, entity1
):
    id_column = merge_request_user_fast_forward.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
        written_by_session=merge_request_user_fast_forward.assigned_to.edit_session,
        approved_by=merge_request_user_fast_forward.assigned_to,
    )


@pytest.fixture
def instance_merge_request_destination_user_no_conflict_fast_forward(
    merge_request_user_fast_forward, entity2
):
    id_column = merge_request_user_fast_forward.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_2,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
        written_by_session=merge_request_user_fast_forward.assigned_to.edit_session,
        approved_by=merge_request_user_fast_forward.assigned_to,
    )


@pytest.fixture
def instance_merge_request_destination_user_same_value1(
    merge_request_user, destination_column_for_mr_user1, entity1
):
    id_column = merge_request_user.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination1,
        value=c.value_origin1,
        time_edit=c.time_instance_destination,
        written_by_session=merge_request_user.assigned_to.edit_session,
        approved_by=merge_request_user.assigned_to,
    )


@pytest.fixture
def conflict_resolution_replace1(
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict1,
):
    return ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity1,
        column_origin=origin_column_for_mr,
        column_destination=destination_column_for_mr,
        value_origin=instances_merge_request_origin_user[1],
        value_destination=instance_merge_request_destination_user_conflict1,
        merge_request=merge_request_user,
        replacement_state=ColumnConflictResolution.REPLACE,
    )


@pytest.fixture
def conflict_resolution_replace0(
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity0,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict0,
):
    return ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity0,
        column_origin=origin_column_for_mr,
        column_destination=destination_column_for_mr,
        value_origin=instances_merge_request_origin_user[0],
        value_destination=instance_merge_request_destination_user_conflict0,
        merge_request=merge_request_user,
        replacement_state=ColumnConflictResolution.REPLACE,
    )


@pytest.fixture
def conflict_resolutions_empty_replace(
    resolution_empty_0, conflict_resolution_replace1
):
    return [resolution_empty_0, conflict_resolution_replace1]


@pytest.fixture
def conflict_resolutions_replace_replace(
    conflict_resolution_replace0, conflict_resolution_replace1
):
    return [conflict_resolution_replace0, conflict_resolution_replace1]


@pytest.fixture
def conflict_resolution_keep(
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity0,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict0,
):
    return ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity0,
        column_origin=origin_column_for_mr,
        column_destination=destination_column_for_mr,
        value_origin=instances_merge_request_origin_user[0],
        value_destination=instance_merge_request_destination_user_conflict0,
        merge_request=merge_request_user,
        replacement_state=ColumnConflictResolution.KEEP,
    )


@pytest.fixture
def conflict_resolution_keep_fast_forward(
    merge_request_user,
    origin_column_for_mr,
    destination_column_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict_fast_forward,
):
    return ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity1,
        column_origin=origin_column_for_mr,
        column_destination=destination_column_for_mr,
        value_origin=instances_merge_request_origin_user[0],
        value_destination=instance_merge_request_destination_user_conflict_fast_forward,
        merge_request=merge_request_user,
        replace=False,
    )


@pytest.fixture
def instance_destination_same_value(merge_request_user):
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_instance_destination_same_value,
        id_entity_persistent=ce.id_persistent_test_0,
        id_column_persistent=merge_request_user.id_destination_persistent,
        value=c.value_origin,
        time_edit=c.time_instance_destination_same_value,
        written_by_session=merge_request_user.assigned_to.edit_session,
        approved_by=merge_request_user.assigned_to,
    )


@pytest.fixture
def instance_destination_updated_same_value1(
    user,
    instance_merge_request_destination_user_conflict1,
):
    old_instance = instance_merge_request_destination_user_conflict1
    value, _ = ValueHistory.change_or_create_versioned(  # pylint: disable=no-member
        id_persistent=old_instance.id_persistent,
        id_entity_persistent=old_instance.id_entity_persistent,
        id_column_persistent=old_instance.id_column_persistent,
        value=c.value_origin1,
        written_by_session=user.edit_session,
        time_edit=c.time_instance_destination_same_value,
        version=old_instance.id,
    )
    value.save()
    return value
