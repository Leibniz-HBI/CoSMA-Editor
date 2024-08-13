# pylint: disable=missing-module-docstring,missing-function-docstring

import pytest

import tests.contribution.preview.common as c
import tests.entity.common as ce
from cosmae.contribution.tag_definition.models_django import TagInstanceContribution
from cosmae.tag.models_django import TagInstanceHistory


@pytest.fixture
def instances_contribution(contribution_tag_def):
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        tag_definition=contribution_tag_def,
        line_idx=500,
        discard=False,
    )
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        tag_definition=contribution_tag_def,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_contribution_assigned_justification(
    contribution_tag_def_assigned_justification,
):
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        tag_definition=contribution_tag_def_assigned_justification,
        line_idx=500,
        discard=False,
    )
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        tag_definition=contribution_tag_def_assigned_justification,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_contribution_assigned_display_txt(
    contribution_tag_def_assigned_display_txt,
):
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        tag_definition=contribution_tag_def_assigned_display_txt,
        line_idx=500,
        discard=False,
    )
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        tag_definition=contribution_tag_def_assigned_display_txt,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_contribution_assigned(contribution_tag_def_assigned):
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        tag_definition=contribution_tag_def_assigned,
        line_idx=500,
        discard=False,
    )
    TagInstanceContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        tag_definition=contribution_tag_def_assigned,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_existing(tag_def):
    TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_instance,
        value=c.value_existing,
        id_entity_persistent=ce.id_persistent_test_0,
        id_tag_definition_persistent=tag_def.id_persistent,
        written_by_session=tag_def.owner.edit_session,
        time_edit=c.time_edit,
        disabled=False,
        hidden=False,
    )
    TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_instance1,
        value=c.value_existing1,
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=tag_def.id_persistent,
        written_by_session=tag_def.owner.edit_session,
        time_edit=c.time_edit1,
        disabled=False,
        hidden=False,
    )
