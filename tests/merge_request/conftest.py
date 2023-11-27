# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments
import pytest

import tests.entity.common as ce
import tests.merge_request.common as c
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.merge_request.models_django import TagConflictResolution, TagMergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance


@pytest.fixture
def destination_tag_def_for_mr(db, user):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_destination,
        id_persistent=c.id_persistent_tag_def_destination,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_destination,
        owner=user,
    )


@pytest.fixture
def destination_tag_def_for_mr_changed(destination_tag_def_for_mr):
    tag_def, _ = TagDefinition.change_or_create(
        id_persistent=destination_tag_def_for_mr.id_persistent,
        version=destination_tag_def_for_mr.id,
        name="changed tag definition test",
        time_edit=c.time_tag_def_destination_changed,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def destination_tag_def_for_mr_user1(db, user1):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_destination,
        id_persistent=c.id_persistent_tag_def_destination_fast_forward,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_destination,
        owner=user1,
    )


@pytest.fixture
def origin_tag_def_for_mr(db, user1):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_origin,
        id_persistent=c.id_persistent_tag_def_origin,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_origin,
        owner=user1,
    )


@pytest.fixture
def origin_tag_def_for_mr_changed(origin_tag_def_for_mr):
    tag_def, _ = TagDefinition.change_or_create(
        id_persistent=origin_tag_def_for_mr.id_persistent,
        version=origin_tag_def_for_mr.id,
        name="changed tag definition test",
        time_edit=c.time_tag_def_origin_changed,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def contribution_for_mr(db, user1):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_contribution,
        description=c.description_contribution,
        id_persistent=c.id_persistent_contribution,
        anonymous=True,
        has_header=True,
        created_by=user1,
        file_name="tmp_file.csv",
    )


@pytest.fixture
def merge_request_user_fast_forward(
    db, origin_tag_def_for_mr, destination_tag_def_for_mr_user1, contribution_for_mr
):
    return TagMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_destination_persistent=destination_tag_def_for_mr_user1.id_persistent,
        created_by=origin_tag_def_for_mr.owner,
        assigned_to=destination_tag_def_for_mr_user1.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request_fast_forward,
        contribution_candidate=contribution_for_mr,
    )


@pytest.fixture
def merge_request_user(
    db, origin_tag_def_for_mr, destination_tag_def_for_mr, contribution_for_mr
):
    return TagMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_destination_persistent=destination_tag_def_for_mr.id_persistent,
        created_by=origin_tag_def_for_mr.owner,
        assigned_to=destination_tag_def_for_mr.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request,
        contribution_candidate=contribution_for_mr,
    )


@pytest.fixture
def destination_tag_def_for_mr1(db, user1):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_destination1,
        id_persistent=c.id_persistent_tag_def_destination1,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_destination1,
        owner=user1,
    )


@pytest.fixture
def origin_tag_def_for_mr1(db, user):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_origin1,
        id_persistent=c.id_persistent_tag_def_origin1,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_origin1,
        owner=user,
    )


@pytest.fixture
def contribution_for_mr1(db, user):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_contribution1,
        description=c.description_contribution1,
        id_persistent=c.id_persistent_contribution1,
        anonymous=True,
        has_header=True,
        created_by=user,
        file_name="tmp_file.csv",
    )


@pytest.fixture
def merge_request_user1(
    db, destination_tag_def_for_mr1, origin_tag_def_for_mr1, contribution_for_mr1
):
    return TagMergeRequest.objects.create(  # pylint: disable=no-member
        id_destination_persistent=destination_tag_def_for_mr1.id_persistent,
        id_origin_persistent=origin_tag_def_for_mr1.id_persistent,
        created_by=origin_tag_def_for_mr1.owner,
        assigned_to=destination_tag_def_for_mr1.owner,
        created_at=c.time_merge_request1,
        id_persistent=c.id_persistent_merge_request1,
        contribution_candidate=contribution_for_mr1,
    )


@pytest.fixture
def instances_merge_request_origin_user(merge_request_user, entity0, entity1):
    id_tag_definition = merge_request_user.id_origin_persistent
    tag_instance = TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_tag_definition_persistent=id_tag_definition,
        value=c.value_origin,
        id_persistent=c.id_instance_origin,
        time_edit=c.time_instance_origin,
    )
    tag_instance1 = TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=id_tag_definition,
        value=c.value_origin1,
        id_persistent=c.id_instance_origin1,
        time_edit=c.time_instance_origin1,
    )
    return [tag_instance, tag_instance1]


@pytest.fixture
def instance_merge_request_origin_user_changed(
    user1, instances_merge_request_origin_user
):
    old_tag_instance = instances_merge_request_origin_user[1]
    tag_instance, _ = TagInstance.change_or_create(
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
def instance_merge_request_destination_user_no_conflict(merge_request_user, entity2):
    id_tag_definition = merge_request_user.id_destination_persistent
    return TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_2,
        id_tag_definition_persistent=id_tag_definition,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict(merge_request_user, entity1):
    id_tag_definition = merge_request_user.id_destination_persistent
    return TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=id_tag_definition,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def instance_merge_request_destination_user_conflict_changed(
    user,
    instance_merge_request_destination_user_conflict,
):
    tag_instance, _ = TagInstance.change_or_create(
        id_entity_persistent=instance_merge_request_destination_user_conflict.id_entity_persistent,
        id_tag_definition_persistent=(
            instance_merge_request_destination_user_conflict.id_tag_definition_persistent
        ),
        id_persistent=instance_merge_request_destination_user_conflict.id_persistent,
        version=instance_merge_request_destination_user_conflict.id,
        user=user,
        value=9001,
        time_edit=c.time_instance_destination_changed,
    )
    tag_instance.save()
    return tag_instance


@pytest.fixture
def instance_merge_request_destination_user_conflict_fast_forward(
    merge_request_user_fast_forward, entity1
):
    id_tag_definition = merge_request_user_fast_forward.id_destination_persistent
    return TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=id_tag_definition,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def instance_merge_request_destination_user_no_conflict_fast_forward(
    merge_request_user_fast_forward, entity2
):
    id_tag_definition = merge_request_user_fast_forward.id_destination_persistent
    return TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_2,
        id_tag_definition_persistent=id_tag_definition,
        id_persistent=c.id_instance_destination,
        value=c.value_destination,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def instance_merge_request_destination_user_same_value1(merge_request_user, entity1):
    id_tag_definition = merge_request_user.id_destination_persistent
    return TagInstance.objects.create(  # pylint: disable=no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=id_tag_definition,
        id_persistent=c.id_instance_destination,
        value=c.value_origin1,
        time_edit=c.time_instance_destination,
    )


@pytest.fixture
def conflict_resolution_replace(
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return TagConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity1,
        tag_definition_origin=origin_tag_def_for_mr,
        tag_definition_destination=destination_tag_def_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[1],
        tag_instance_destination=instance_merge_request_destination_user_conflict,
        merge_request=merge_request_user,
        replace=True,
    )


@pytest.fixture
def conflict_resolution_keep(
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity0,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    return TagConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity0,
        tag_definition_origin=origin_tag_def_for_mr,
        tag_definition_destination=destination_tag_def_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[0],
        tag_instance_destination=None,
        merge_request=merge_request_user,
        replace=False,
    )


@pytest.fixture
def conflict_resolution_keep_fast_forward(
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict_fast_forward,
):
    return TagConflictResolution.objects.create(  # pylint: disable=no-member
        entity=entity1,
        tag_definition_origin=origin_tag_def_for_mr,
        tag_definition_destination=destination_tag_def_for_mr,
        tag_instance_origin=instances_merge_request_origin_user[0],
        tag_instance_destination=instance_merge_request_destination_user_conflict_fast_forward,
        merge_request=merge_request_user,
        replace=False,
    )


@pytest.fixture
def instance_destination_same_value(merge_request_user):
    return TagInstance.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_instance_destination_same_value,
        id_entity_persistent=ce.id_persistent_test_0,
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
    tag_instance, _ = TagInstance.change_or_create(  # pylint: disable=no-member
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
