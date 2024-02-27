# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments
import pytest

import tests.merge_request.entity.common as c
from cosmae.entity.models_django import Entity
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution,
    EntityMergeRequest,
)
from cosmae.tag.models_django import TagDefinitionHistory, TagInstanceHistory


@pytest.fixture
def origin_entity_for_mr(db):
    return Entity.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_entity_origin_persistent,
        display_txt=c.display_txt_entity_origin,
        time_edit=c.time_entity_origin,
    )


@pytest.fixture
def origin_entity_for_mr_changed(origin_entity_for_mr, user):
    entity, _ = Entity.change_or_create(
        id_persistent=origin_entity_for_mr.id_persistent,
        time_edit=c.time_entity_origin_changed,
        version=origin_entity_for_mr.id,
        display_txt="Changed entity origin",
        requester=user,
    )
    entity.save()
    return entity


@pytest.fixture
def destination_entity_for_mr(db):
    return Entity.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_entity_destination_persistent,
        display_txt=c.display_txt_entity_destination,
        time_edit=c.time_entity_destination,
    )


@pytest.fixture
def destination_entity_for_mr_changed(destination_entity_for_mr, user):
    entity, _ = Entity.change_or_create(
        id_persistent=destination_entity_for_mr.id_persistent,
        version=destination_entity_for_mr.id,
        display_txt="changed entity destination",
        time_edit=c.time_entity_destination_changed,
        requester=user,
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
    )


@pytest.fixture
def instances_merge_request_origin_user(
    merge_request_user, tag_def, tag_def1, tag_def_curated
):
    tag_instance = TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_origin_persistent,
        id_tag_definition_persistent=tag_def.id_persistent,
        value=c.value_origin,
        id_persistent=c.id_instance_origin,
        time_edit=c.time_instance_origin,
    )
    tag_instance1 = TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_origin_persistent,
        id_tag_definition_persistent=tag_def1.id_persistent,
        value=c.value_origin1,
        id_persistent=c.id_instance_origin1,
        time_edit=c.time_instance_origin1,
    )
    tag_instance_curated = (
        TagInstanceHistory.objects.create(  # pylint: disable=no-member
            id_entity_persistent=c.id_entity_origin_persistent,
            id_tag_definition_persistent=tag_def_curated.id_persistent,
            value=c.value_origin_curated,
            id_persistent=c.id_instance_origin_curated,
            time_edit=c.time_instance_origin_curated,
        )
    )
    return [tag_instance, tag_instance1, tag_instance_curated]


@pytest.fixture
def instance_merge_request_origin_user_changed(
    user1, instances_merge_request_origin_user
):
    old_tag_instance = instances_merge_request_origin_user[1]
    tag_instance, _ = TagInstanceHistory.change_or_create(
        id_entity_persistent=old_tag_instance.id_entity_persistent,
        id_tag_definition_persistent=old_tag_instance.id_tag_definition_persistent,
        id_persistent=old_tag_instance.id_persistent,
        version=old_tag_instance.id,
        user=user1,
        value=9001,
        time_edit=c.time_instance_origin1_changed,
    )
    tag_instance.save()
    return tag_instance


@pytest.fixture
def instance_merge_request_destination_user_no_conflict(merge_request_user, tag_def1):
    return TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_tag_definition_persistent=tag_def1.id_persistent,
        id_persistent=c.id_instance_destination,
        value=c.value_origin,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict(merge_request_user, tag_def1):
    return TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_tag_definition_persistent=tag_def1.id_persistent,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def conflict_curated(merge_request_user, tag_def_curated):
    return TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_tag_definition_persistent=tag_def_curated.id_persistent,
        value=c.value_destination_curated,
        id_persistent=c.id_instance_destination_curated,
        time_edit=c.time_instance_destination_curated,
    )


@pytest.fixture
def resolution_curated_destination_none(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    tag_def_curated,
    instances_merge_request_origin_user,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        tag_definition=tag_def_curated,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[2],
        tag_instance_destination=None,
        merge_request=merge_request_user,
        replace=True,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict_changed(
    user1,
    instance_merge_request_destination_user_conflict,
):
    tag_instance, _ = TagInstanceHistory.change_or_create(
        id_entity_persistent=instance_merge_request_destination_user_conflict.id_entity_persistent,
        id_tag_definition_persistent=(
            instance_merge_request_destination_user_conflict.id_tag_definition_persistent
        ),
        id_persistent=instance_merge_request_destination_user_conflict.id_persistent,
        version=instance_merge_request_destination_user_conflict.id,
        user=user1,
        value=9001,
        time_edit=c.time_instance_destination_changed,
    )
    tag_instance.save()
    return tag_instance


@pytest.fixture
def instance_merge_request_destination_user_same_value1(merge_request_user):
    id_tag_definition = merge_request_user.id_destination_persistent
    return TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_entity_destination_persistent,
        id_tag_definition_persistent=id_tag_definition,
        id_persistent=c.id_instance_destination,
        value=c.value_origin1,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture()
def tag_def_for_mr_changed(tag_def1):
    tag_def, _ = TagDefinitionHistory.change_or_create(
        id_persistent=tag_def1.id_persistent,
        version=tag_def1.id,
        time_edit=c.time_tag_def_changed,
        name="changed tag def 1",
        requester=tag_def1.owner,
    )
    tag_def.save()
    return tag_def


@pytest.fixture()
def tag_def_for_mr_changed_owner(tag_def1, user_commissioner):
    tag_def, _ = tag_def1.set_owner(
        user_commissioner, tag_def1.owner, c.time_tag_def_changed
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def conflict_resolution_replace(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    tag_def1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        tag_definition=tag_def1,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[1],
        tag_instance_destination=instance_merge_request_destination_user_conflict,
        merge_request=merge_request_user,
        replace=True,
    )


@pytest.fixture
def conflict_resolution_replace_empty_destination(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    tag_def1,
    instances_merge_request_origin_user,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        tag_definition=tag_def1,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[1],
        tag_instance_destination=None,
        merge_request=merge_request_user,
        replace=True,
    )


@pytest.fixture
def conflict_resolution_keep(
    merge_request_user,
    origin_entity_for_mr,
    destination_entity_for_mr,
    tag_def,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return EntityConflictResolution.objects.create(  # pylint: disable=no-member
        tag_definition=tag_def,
        entity_origin=origin_entity_for_mr,
        entity_destination=destination_entity_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[0],
        tag_instance_destination=None,
        merge_request=merge_request_user,
        replace=False,
    )


@pytest.fixture
def instance_destination_same_value(merge_request_user):
    return TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_entity_destination_persistent,
        id_entity_persistent=c.id_entity_destination_persistent,
        id_tag_definition_persistent=merge_request_user.id_destination_persistent,
        value=c.value_origin,
        time_edit=c.time_instance_destination_same_value,
    )


@pytest.fixture
def instance_destination_updated_same_value1(
    user,
    instance_merge_request_destination_user_conflict,
):
    old_instance = instance_merge_request_destination_user_conflict
    tag_instance, _ = TagInstanceHistory.change_or_create(  # pylint: disable=no-member
        id_persistent=old_instance.id_persistent,
        id_entity_persistent=old_instance.id_entity_persistent,
        id_tag_definition_persistent=old_instance.id_tag_definition_persistent,
        value=c.value_origin1,
        user=user,
        time_edit=c.time_instance_destination_same_value,
        version=old_instance.id,
    )
    tag_instance.save()
    return tag_instance


@pytest.fixture
def instance_curated_updated(instances_merge_request_origin_user, user_commissioner):
    instance_curated = instances_merge_request_origin_user[2]
    updated, _ = TagInstanceHistory.change_or_create(
        id_persistent=instance_curated.id_persistent,
        version=instance_curated.id,
        id_entity_persistent=instance_curated.id_entity_persistent,
        id_tag_definition_persistent=instance_curated.id_tag_definition_persistent,
        user=user_commissioner,
        value=c.value_origin_curated_changed,
        time_edit=c.time_instance_destination_changed,
    )
    updated.save()
