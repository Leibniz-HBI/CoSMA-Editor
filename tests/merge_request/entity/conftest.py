# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments,too-many-positional-arguments
import pytest

import tests.merge_request.entity.common as c
from cosmae.column.models_django import ColumnHistory
from cosmae.entity.models_django import EntityHistory
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution,
    EntityMergeRequest,
)
from cosmae.value.models_django import ValueHistory


@pytest.fixture
def origin_entity_for_mr(db, user):
    entity, _ = EntityHistory.change_or_create_versioned(  # pylint: disable=no-member
        id_persistent=c.id_entity_origin_persistent,
        display_txt=c.display_txt_entity_origin,
        time_edit=c.time_entity_origin,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )
    entity.save()
    return entity


@pytest.fixture
def origin_entity_for_mr_changed(origin_entity_for_mr, user):
    entity, _ = EntityHistory.change_or_create_versioned(
        id_persistent=origin_entity_for_mr.id_persistent,
        time_edit=c.time_entity_origin_changed,
        version=origin_entity_for_mr.id,
        display_txt="Changed entity origin",
        written_by_session=user.edit_session,
    )
    entity.save()
    return entity


@pytest.fixture
def destination_entity_for_mr(db, user):
    entity, _ = EntityHistory.change_or_create_versioned(  # pylint: disable=no-member
        id_persistent=c.id_entity_destination_persistent,
        display_txt=c.display_txt_entity_destination,
        time_edit=c.time_entity_destination,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )
    entity.save()
    return entity


@pytest.fixture
def destination_entity_for_mr_changed(destination_entity_for_mr, user):
    entity, _ = EntityHistory.change_or_create_versioned(
        id_persistent=destination_entity_for_mr.id_persistent,
        version=destination_entity_for_mr.id,
        display_txt="changed entity destination",
        time_edit=c.time_entity_destination_changed,
        written_by_session=user.edit_session,
    )
    entity.save()
    return entity


@pytest.fixture
def merge_request_user(
    db, origin_entity_for_mr, destination_entity_for_mr, user_commissioner
):
    return EntityMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_entity_for_mr.id_persistent,
        id_destination_persistent=destination_entity_for_mr.id_persistent,
        created_by=user_commissioner,
        created_at=c.time_merge_request,
        id_persistent=c.id_merge_request_persistent,
        state=EntityMergeRequest.State.OPEN,
    )


@pytest.fixture
def instances_merge_request_origin_user(
    merge_request_user, column, column1, column_curated, user_commissioner
):
    value = ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_origin_persistent,
        id_column_persistent=column.id_persistent,
        value=c.value_origin,
        id_persistent=c.id_instance_origin,
        time_edit=c.time_instance_origin,
        written_by_session=column.owner.edit_session,
        approved_by=column.owner.id_persistent,
    )
    value1 = ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_origin_persistent,
        id_column_persistent=column1.id_persistent,
        value=c.value_origin1,
        id_persistent=c.id_instance_origin1,
        time_edit=c.time_instance_origin1,
        written_by_session=column1.owner.edit_session,
        approved_by=column1.owner.id_persistent,
    )
    value_curated = ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_origin_persistent,
        id_column_persistent=column_curated.id_persistent,
        value=c.value_origin_curated,
        id_persistent=c.id_instance_origin_curated,
        time_edit=c.time_instance_origin_curated,
        written_by_session=user_commissioner.edit_session,
        approved_by=user_commissioner.id_persistent,
    )
    return [value, value1, value_curated]


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
def instance_merge_request_destination_user_no_conflict(merge_request_user, column1):
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_column_persistent=column1.id_persistent,
        id_persistent=c.id_instance_destination,
        value=c.value_origin,
        time_edit=c.time_instance_destination,
        written_by_session=column1.owner.edit_session,
        approved_by=column1.owner.id_persistent,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict(merge_request_user, column1):
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_column_persistent=column1.id_persistent,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
        written_by_session=column1.owner.edit_session,
        approved_by=column1.owner.id_persistent,
    )


@pytest.fixture
def conflict_curated(merge_request_user, column_curated, user_commissioner):
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_column_persistent=column_curated.id_persistent,
        value=c.value_destination_curated,
        id_persistent=c.id_instance_destination_curated,
        time_edit=c.time_instance_destination_curated,
        written_by_session=user_commissioner.edit_session,
        approved_by=user_commissioner.id_persistent,
    )


@pytest.fixture
def resolution_curated_destination_none(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    column_curated,
    instances_merge_request_origin_user,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        column=column_curated,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        value_origin=instances_merge_request_origin_user[2],
        value_destination=None,
        merge_request=merge_request_user,
        replacement_state=EntityConflictResolution.REPLACE,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict_changed(
    user1,
    instance_merge_request_destination_user_conflict,
):
    value, _ = ValueHistory.change_or_create_versioned(
        id_entity_persistent=instance_merge_request_destination_user_conflict.id_entity_persistent,
        id_column_persistent=(
            instance_merge_request_destination_user_conflict.id_column_persistent
        ),
        id_persistent=instance_merge_request_destination_user_conflict.id_persistent,
        version=instance_merge_request_destination_user_conflict.id,
        written_by_session=user1.edit_session,
        value=9001,
        time_edit=c.time_instance_destination_changed,
    )
    value.save()
    return value


@pytest.fixture
def instance_merge_request_destination_user_same_value1(merge_request_user):
    id_column = merge_request_user.id_destination_persistent
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_column_persistent=id_column,
        id_persistent=c.id_instance_destination,
        value=c.value_origin1,
        time_edit=c.time_instance_destination,
        written_by_session=merge_request_user.created_by.edit_session,
        approved_by=merge_request_user.created_by.id_persistent,
    )


@pytest.fixture()
def column_for_mr_changed(column1):
    column, _ = ColumnHistory.change_or_create_versioned(
        id_persistent=column1.id_persistent,
        version=column1.id,
        time_edit=c.time_column_changed,
        name="changed column 1",
        written_by_session=column1.owner.edit_session,
    )
    column.save()
    return column


@pytest.fixture()
def column_for_mr_changed_owner(column1, user_commissioner):
    column, _ = column1.set_owner(
        user_commissioner, column1.owner, c.time_column_changed
    )
    column.save()
    return column


@pytest.fixture
def conflict_resolution_replace(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    column1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        column=column1,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        value_origin=instances_merge_request_origin_user[1],
        value_destination=instance_merge_request_destination_user_conflict,
        merge_request=merge_request_user,
        replacement_state=EntityConflictResolution.REPLACE,
    )


@pytest.fixture
def conflict_resolution_replacement_value(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    column1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        column=column1,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        value_origin=instances_merge_request_origin_user[1],
        value_destination=instance_merge_request_destination_user_conflict,
        merge_request=merge_request_user,
        # replacement_state=EntityConflictResolution.REPLACE,
        replacement_state=EntityConflictResolution.VALUE,
        replacement_value=c.replacement_value,
    )


@pytest.fixture
def conflict_resolution_replace_empty_destination(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    column1,
    instances_merge_request_origin_user,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        column=column1,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        value_origin=instances_merge_request_origin_user[1],
        value_destination=None,
        merge_request=merge_request_user,
        replacement_state=EntityConflictResolution.REPLACE,
    )


@pytest.fixture
def conflict_resolution_keep(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    column,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        column=column,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        value_origin=instances_merge_request_origin_user[0],
        value_destination=None,
        merge_request=merge_request_user,
        replacement_state=EntityConflictResolution.KEEP,
    )


@pytest.fixture
def value_destination_same_value(merge_request_user):
    return ValueHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_entity_destination_persistent,
        id_entity_persistent=c.id_entity_destination_persistent,
        id_column_persistent=merge_request_user.id_destination_persistent,
        value=c.value_origin,
        time_edit=c.time_instance_destination_same_value,
        written_by_session=merge_request_user.created_by.edit_session,
        approved_by=merge_request_user.created_by.id_persistent,
    )


@pytest.fixture
def value_destination_updated_same_value1(
    user,
    instance_merge_request_destination_user_conflict,
):
    old_instance = instance_merge_request_destination_user_conflict
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


@pytest.fixture
def value_curated_updated(instances_merge_request_origin_user, user_commissioner):
    instance_curated = instances_merge_request_origin_user[2]
    updated, _ = ValueHistory.change_or_create_versioned(
        id_persistent=instance_curated.id_persistent,
        version=instance_curated.id,
        id_entity_persistent=instance_curated.id_entity_persistent,
        id_column_persistent=instance_curated.id_column_persistent,
        written_by_session=user_commissioner.edit_session,
        value=c.value_origin_curated_changed,
        time_edit=c.time_instance_destination_changed,
    )
    updated.save()
