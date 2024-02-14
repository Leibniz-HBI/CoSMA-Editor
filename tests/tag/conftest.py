# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
from datetime import timedelta

import pytest

import tests.entity.common as ce
import tests.tag.common as c
from cosmae.tag.models_django import (
    OwnershipRequest,
    TagDefinition,
    TagDefinitionHistory,
    TagInstanceHistory,
)


@pytest.fixture
def tag_def_history(db):
    "Shared tag definition for tests."
    tag_def, _ = TagDefinitionHistory.change_or_create(
        id_persistent=c.id_tag_def_persistent_test,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def(tag_def_history):
    return TagDefinition.objects.get(id=tag_def_history.id)  # pylint: disable=no-member


@pytest.fixture
def tag_def_user_history(user):
    tag_def = TagDefinitionHistory(  # pylint: disable=no-member
        id_persistent=c.id_tag_def_persistent_test_user,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test_user,
        time_edit=c.time_edit_test,
        owner=user,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_user(tag_def_user_history):
    return TagDefinition.objects.get(  # pylint: disable=no-member
        id=tag_def_user_history.id
    )


@pytest.fixture
def tag_def_user1(user):
    tag_def = TagDefinitionHistory(  # pylint: disable=no-member
        id_persistent=c.id_tag_def_persistent_test_user1,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test1,
        time_edit=c.time_edit_test,
        owner=user,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_parent(db):
    tag_def = TagDefinitionHistory(
        id_persistent=c.id_tag_def_parent_persistent_test,
        type=TagDefinition.FLOAT,
        name=c.name_tag_def_parent_test,
        time_edit=c.time_edit_test + timedelta(seconds=5),
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_child_0_history():
    "A shared child tag definition for tests"
    tag_def, _ = TagDefinitionHistory.change_or_create(
        id_persistent=c.id_tag_def_persistent_child_0,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 0",
        time_edit=c.time_edit_test + timedelta(seconds=10),
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_child_0(tag_def_child_0_history):
    return TagDefinition.objects.get(  # pylint: disable=no-member
        id=tag_def_child_0_history.id
    )


@pytest.fixture
def tag_def_child_1_history():
    "Another shared child tag definition for tests"
    tag_def, _ = TagDefinitionHistory.change_or_create(
        id_persistent=c.id_tag_def_persistent_child_1,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 1",
        time_edit=c.time_edit_test + timedelta(seconds=10),
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_child_1(tag_def_child_1_history):
    return TagDefinition.objects.get(  # pylint: disable=no-member
        id=tag_def_child_1_history.id
    )


@pytest.fixture
def tag_def_curated():
    "A curated tag definition for tests"
    return TagDefinitionHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_tag_def_curated_test,
        type=TagDefinition.INNER,
        name=c.name_tag_def_curated_test,
        time_edit=c.time_edit_test + timedelta(minutes=4),
        curated=True,
    )


@pytest.fixture
def tag_instances_user():
    tag_inst = TagInstanceHistory(
        id_persistent=c.id_instance_test0,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value",
        time_edit=c.time_edit_instance_test,
    )
    tag_inst1 = TagInstanceHistory(
        id_persistent=c.id_instance_test1,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1",
        time_edit=c.time_edit_instance_test,
    )
    tag_inst2 = TagInstanceHistory(
        id_persistent=c.id_instance_test2,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value 2",
        time_edit=c.time_edit_instance_test,
    )
    tag_inst3 = TagInstanceHistory(
        id_persistent=c.id_instance_test3,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 3",
        time_edit=c.time_edit_instance_test,
    )
    tag_instances = [tag_inst, tag_inst1, tag_inst2, tag_inst3]
    for inst in tag_instances:
        inst.save()
    return tag_instances


@pytest.fixture
def ownership_request_user(tag_def_user, user1):
    return OwnershipRequest.objects.create(  # pylint: disable=no-member
        id_tag_definition_persistent=tag_def_user.id_persistent,
        petitioner=tag_def_user.owner,
        receiver=user1,
        id_persistent=c.id_ownership_request_test,
    )


@pytest.fixture
def ownership_request_curated(tag_def_curated, user, user_commissioner):
    return OwnershipRequest.objects.create(  # pylint: disable=no-member
        id_tag_definition_persistent=tag_def_curated.id_persistent,
        petitioner=user_commissioner,
        receiver=user,
        id_persistent=c.id_ownership_request_curated_test,
    )


@pytest.fixture
def ownership_request_curated_editor(tag_def_curated, user, user_editor):
    return OwnershipRequest.objects.create(  # pylint: disable=no-member
        id_tag_definition_persistent=tag_def_curated.id_persistent,
        receiver=user,
        petitioner=user_editor,
        id_persistent=c.id_ownership_request_curated_test,
    )
