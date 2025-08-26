"Fixtures for contribution entity queue tests."

# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import pytest

import tests.contribution.entity.common as c
import tests.entity.common as ce
import tests.value.common as cv
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.value.models_django import ValueHistory


@pytest.fixture()
def entity_match(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_destination_persistent=ce.id_persistent_test_1,
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        contribution_candidate=contribution_candidate,
    )


@pytest.fixture
def entity_discarded(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_destination_persistent=None,
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        contribution_candidate=contribution_candidate,
        discard=True,
    )


@pytest.fixture()
def contribution_with_justification(user):

    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        state=ContributionCandidate.ENTITIES_ASSIGNED,
        name="contribution with justification",
        id_persistent="1b75363f-bf94-432f-96af-2293aa53ab8b",
        has_header=True,
        created_by=user,
        justification="justification",
    )


@pytest.fixture
def column(user):
    return ColumnHistory.objects.create(  # pylint: disable = no-member
        id_persistent=c.id_column_test,
        name=c.name_column_test,
        type=Column.STRING,
        time_edit=c.time_edit_column_test,
        owner=user,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def column1(user):
    return ColumnHistory.objects.create(  # pylint: disable = no-member
        id_persistent=c.id_column_test1,
        id_parent_persistent=c.id_column_test,
        name=c.name_column_test1,
        type=Column.STRING,
        time_edit=c.time_edit_column_test1,
        owner=user,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def values_for_replace(column, column1, entities):
    inst0 = ValueHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_column_persistent=c.id_column_test,
        id_persistent=c.id_value_replace_test,
        value="a",
        time_edit=c.time_edit_value_test,
        written_by_session=column.owner.edit_session,
        approved_by=column.owner.id_persistent,
    )
    inst0 = ValueHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_column_persistent=c.id_column_test,
        id_persistent=c.id_value_replace_test,
        value="b",
        previous_version=inst0,
        time_edit=c.time_edit_value_test,
        written_by_session=column.owner.edit_session,
        approved_by=column.owner.id_persistent,
    )
    _inst1 = ValueHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_column_persistent=c.id_column_test,
        id_persistent=c.id_value_replace_test1,
        value="a",
        time_edit=c.time_edit_value_test,
        written_by_session=column.owner.edit_session,
        approved_by=column.owner.id_persistent,
    )


@pytest.fixture
def value_existing(column, column1, entities):
    inst0 = ValueHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_column_persistent=c.id_column_test,
        id_persistent=c.id_value_existing_test,
        value="a",
        time_edit=c.time_edit_value_test,
        written_by_session=column.owner.edit_session,
        approved_by=column.owner.id_persistent,
    )
    inst0 = ValueHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_column_persistent=c.id_column_test,
        id_persistent=c.id_value_existing_test,
        value="b",
        previous_version=inst0,
        time_edit=c.time_edit_value_test,
        written_by_session=column.owner.edit_session,
        approved_by=column.owner.id_persistent,
    )
    _inst1 = ValueHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=c.id_column_test1,
        id_persistent=c.id_value_existing_test1,
        value="a",
        time_edit=c.time_edit_value_test,
        written_by_session=column1.owner.edit_session,
        approved_by=column1.owner.id_persistent,
    )


@pytest.fixture
def values(column, column1, entities):
    value0, _ = ValueHistory.change_or_create_versioned(
        id_persistent=cv.id_instance_test0,
        time_edit=ce.time_edit_test_0,
        id_column_persistent=c.id_column_test,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        written_by_session=column.owner.edit_session,
        value="2.4",
    )
    value0.save()
    value1, _ = ValueHistory.change_or_create_versioned(
        id_persistent=cv.id_instance_test1,
        id_column_persistent=c.id_column_test,
        id_entity_persistent=ce.id_persistent_test_0,
        time_edit=ce.time_edit_test_0,
        written_by_session=column.owner.edit_session,
        value="1.7",
    )
    value1.save()
    value2, _ = ValueHistory.change_or_create_versioned(
        id_persistent=cv.id_instance_test2,
        id_column_persistent=c.id_column_test1,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        time_edit=ce.time_edit_test_0,
        written_by_session=column1.owner.edit_session,
        value="foo",
    )
    value2.save()
    value2, _ = ValueHistory.change_or_create_versioned(
        id_persistent=cv.id_instance_test2,
        id_column_persistent=c.id_column_test1,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        time_edit=ce.time_edit_test_0,
        written_by_session=column1.owner.edit_session,
        value="bar",
        version=value2.id,
    )
    value2.save()
    value3, _ = ValueHistory.change_or_create_versioned(
        id_persistent=cv.id_instance_test3,
        id_column_persistent=c.id_column_test1,
        id_entity_persistent=ce.id_persistent_test_1,
        time_edit=ce.time_edit_test_0,
        written_by_session=column1.owner.edit_session,
        value="baz",
    )
    value3.save()
    return [value0, value1, value2, value3]
