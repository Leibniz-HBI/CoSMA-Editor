# pylint: disable=missing-module-docstring,missing-function-docstring

import pytest

import tests.contribution.preview.common as c
import tests.entity.common as ce
from cosmae.contribution.column.models_django import ValueContribution
from cosmae.value.models_django import ValueHistory


@pytest.fixture
def instances_contribution(contribution_column):
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        column=contribution_column,
        line_idx=500,
        discard=False,
    )
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        column=contribution_column,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_contribution_assigned_justification(
    contribution_column_assigned_justification,
):
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        column=contribution_column_assigned_justification,
        line_idx=500,
        discard=False,
    )
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        column=contribution_column_assigned_justification,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_contribution_assigned_display_txt(
    contribution_column_assigned_display_txt,
):
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        column=contribution_column_assigned_display_txt,
        line_idx=500,
        discard=False,
    )
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        column=contribution_column_assigned_display_txt,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_contribution_assigned(contribution_column_assigned):
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution,
        id_entity_persistent=ce.id_persistent_test_0,
        column=contribution_column_assigned,
        line_idx=500,
        discard=False,
    )
    ValueContribution.objects.create(  # pylint: disable=no-member
        value=c.value_contribution_1,
        id_entity_persistent=ce.id_persistent_test_1,
        column=contribution_column_assigned,
        line_idx=505,
        discard=False,
    )


@pytest.fixture
def instances_existing(column):
    ValueHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_instance,
        value=c.value_existing,
        id_entity_persistent=ce.id_persistent_test_0,
        id_column_persistent=column.id_persistent,
        written_by_session=column.owner.edit_session,
        time_edit=c.time_edit,
        disabled=False,
        hidden=False,
    )
    ValueHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_instance1,
        value=c.value_existing1,
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=column.id_persistent,
        written_by_session=column.owner.edit_session,
        time_edit=c.time_edit1,
        disabled=False,
        hidden=False,
    )
