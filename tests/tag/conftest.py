# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
from datetime import timedelta

import pytest

import tests.entity.common as ce
import tests.tag.common as c
from cosmae.tag.models_django import TagDefinition, TagInstance


@pytest.fixture
def tag_def():
    "Shared tag definition for tests."
    return TagDefinition(
        id_persistent=c.id_tag_def_persistent_test,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
    )


@pytest.fixture
def tag_def_user(user):
    tag_def = TagDefinition(  # pylint: disable=no-member
        id_persistent=c.id_tag_def_persistent_test_user,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
        owner=user,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_user1(user):
    tag_def = TagDefinition(  # pylint: disable=no-member
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
def tag_def_child_0():
    "A shared child tag definition for tests"
    return TagDefinition(
        id_persistent=c.id_tag_def_persistent_child_0,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 0",
        time_edit=c.time_edit_test + timedelta(seconds=10),
    )


@pytest.fixture
def tag_def_child_1():
    "Another shared child tag definition for tests"
    return TagDefinition(
        id_persistent=c.id_tag_def_persistent_child_1,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 1",
        time_edit=c.time_edit_test + timedelta(seconds=10),
    )


@pytest.fixture
def tag_instances_user():
    tag_inst = TagInstance(
        id_persistent=c.id_instance_test0,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value",
        time_edit=c.time_edit_instance_test,
    )
    tag_inst1 = TagInstance(
        id_persistent=c.id_instance_test1,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1",
        time_edit=c.time_edit_instance_test,
    )
    tag_inst2 = TagInstance(
        id_persistent=c.id_instance_test2,
        id_tag_definition_persistent=c.id_tag_def_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value 2",
        time_edit=c.time_edit_instance_test,
    )
    tag_inst3 = TagInstance(
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
