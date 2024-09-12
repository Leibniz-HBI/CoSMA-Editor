# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
from datetime import timedelta

import pytest

import tests.tag.common as c
from cosmae.tag.models_django import (
    OwnershipRequest,
    TagDefinition,
    TagDefinitionHistory,
)


@pytest.fixture
def tag_def_history(db, user):
    "Shared tag definition for tests."
    tag_def, _ = TagDefinitionHistory.change_or_create_versioned(
        id_persistent=c.id_tag_def_persistent_test,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_no_owner_history(db, user_commissioner):
    "Shared tag definition for tests."
    tag_def, _ = TagDefinitionHistory.change_or_create_versioned(
        id_persistent=c.id_tag_def_persistent_test,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
        owner_id=None,
        written_by_session=user_commissioner.edit_session,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def(tag_def_history):
    return TagDefinition.objects.get(id=tag_def_history.id)  # pylint: disable=no-member


@pytest.fixture
def tag_def_user_history(user):
    tag_def, _ = (
        TagDefinitionHistory.change_or_create_versioned(  # pylint: disable=no-member
            id_persistent=c.id_tag_def_persistent_test_user,
            time_edit=c.time_edit_test,
            written_by_session=user.edit_session,
            type=TagDefinition.FLOAT,
            id_parent_persistent=None,
            name=c.name_tag_def_test_user,
            owner=user,
        )
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
        time_edit=c.time_edit_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test1,
        owner=user,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_parent(db, user):
    tag_def, _ = TagDefinitionHistory.change_or_create_versioned(
        id_persistent=c.id_tag_def_parent_persistent_test,
        time_edit=c.time_edit_test + timedelta(seconds=5),
        written_by_session=user.edit_session,
        type=TagDefinition.FLOAT,
        name=c.name_tag_def_parent_test,
        owner=user,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_child_0_history(user):
    "A shared child tag definition for tests"
    tag_def, _ = TagDefinitionHistory.change_or_create_versioned(
        id_persistent=c.id_tag_def_persistent_child_0,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 0",
        time_edit=c.time_edit_test + timedelta(seconds=10),
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_child_0(tag_def_child_0_history):
    return TagDefinition.objects.get(  # pylint: disable=no-member
        id=tag_def_child_0_history.id
    )


@pytest.fixture
def tag_def_child_1_history(user):
    "Another shared child tag definition for tests"
    tag_def, _ = TagDefinitionHistory.change_or_create_versioned(
        id_persistent=c.id_tag_def_persistent_child_1,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 1",
        time_edit=c.time_edit_test + timedelta(seconds=10),
        owner_id=user.id,
        written_by_session=user.edit_session,
    )
    tag_def.save()
    return tag_def


@pytest.fixture
def tag_def_child_1(tag_def_child_1_history):
    return TagDefinition.objects.get(  # pylint: disable=no-member
        id=tag_def_child_1_history.id
    )


@pytest.fixture
def tag_def_curated(user):
    "A curated tag definition for tests"
    return TagDefinitionHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_tag_def_curated_test,
        type=TagDefinition.INNER,
        name=c.name_tag_def_curated_test,
        time_edit=c.time_edit_test + timedelta(minutes=4),
        curated=True,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


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
