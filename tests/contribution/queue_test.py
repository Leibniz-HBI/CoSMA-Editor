"""Tests for the contribution queue."""

# pylint: disable=unused-argument, redefined-outer-name, too-many-arguments, too-many-positional-arguments

from pytest import fixture

import tests.contribution.common as c
from cosmae.column.models_django import ColumnHistory
from cosmae.contribution.column.models_django import (
    ColumnContribution,
    ValueContribution,
)
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.queue import delete_contribution
from cosmae.entity.models_django import EntityHistory
from cosmae.merge_request.models_django import (
    ColumnConflictResolution,
    ColumnMergeRequest,
)
from cosmae.value.models_django import ValueHistory


@fixture
def contribution_value(contribution_column):
    "A contribution value for tests"
    return ValueContribution.objects.create(  # pylint: disable=no-member
        column=contribution_column,
        value="test_value",
        id_entity_persistent=c.id_test0,
        line_idx=4,
        discard=False,
    )


@fixture
def mr_contribution(contribution_user, column_user, column_user1):
    "A merge request for delete contribution tests."
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_mr_persistent,
        id_origin_persistent=column_user1.id_persistent,
        id_destination_persistent=column_user.id_persistent,
        contribution_candidate=contribution_user,
        state=ColumnMergeRequest.OPEN,
        created_by=contribution_user.created_by,
        created_at=c.time_edit_mr,
    )


@fixture
def resolution_contribution(
    mr_contribution,
    contribution_user,
    column_user_history,
    column_user1,
    entity_duplicate,
    values_user,
):
    "A conflict resolution for delete contribution tests."
    return ColumnConflictResolution.objects.create(  # pylint: disable=no-member
        merge_request=mr_contribution,
        replacement_state=ColumnConflictResolution.KEEP,
        column_destination=column_user_history,
        column_origin=column_user1,
        entity=entity_duplicate,
        value_destination=values_user[0],
        value_origin=values_user[2],
    )


def test_delete_contribution(
    contribution_user,
    contribution_other,
    contribution_column,
    duplicate_assignment,
    mr_contribution,
    resolution_contribution,
    contribution_value,
):
    "Test that deleting a contribution deletes all related objects"
    contribution_user.mark_delete = True
    contribution_user.save()
    delete_contribution(contribution_user.id_persistent)

    assert len(ColumnHistory.objects.all()) == 1
    assert len(ValueHistory.objects.all()) == 4
    assert len(EntityDuplicate.objects.all()) == 0  # pylint: disable=no-member
    assert len(EntityHistory.objects.all()) == 1
    assert len(ColumnContribution.objects.all()) == 0  # pylint: disable=no-member
    assert len(ValueContribution.objects.all()) == 0  # pylint: disable=no-member
    assert len(ColumnMergeRequest.objects.all()) == 0  # pylint: disable=no-member
    assert len(ColumnConflictResolution.objects.all()) == 0  # pylint: disable=no-member


def test_keeps_other(
    contribution_other,
    contribution_user,
    duplicate_assignment,
    mr_contribution,
    resolution_contribution,
    contribution_value,
):
    "Test that deleting a contribution does not delete other contributions"
    delete_contribution(contribution_other.id_persistent)
    assert len(ColumnHistory.objects.all()) == 2
    assert len(EntityDuplicate.objects.all()) == 1  # pylint: disable=no-member
    assert len(EntityHistory.objects.all()) == 2
    assert len(ColumnContribution.objects.all()) == 1  # pylint: disable=no-member
    assert len(ValueContribution.objects.all()) == 1  # pylint: disable=no-member
    assert len(ColumnMergeRequest.objects.all()) == 1  # pylint: disable=no-member
    assert len(ColumnConflictResolution.objects.all()) == 1  # pylint: disable=no-member
