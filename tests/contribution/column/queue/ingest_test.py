# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,too-many-arguments,too-many-positional-arguments
from uuid import uuid4

import pandas as pd
import pytest
from django.db.models import Subquery

import tests.entity.common as ce
from cosmae.column.models_django import Column, ColumnHistory, column_objects
from cosmae.contribution.column.models_django import ColumnContribution
from cosmae.contribution.column.queue.ingest import ingest_values_from_csv
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity, EntityJustification
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.util import timestamp
from cosmae.value.models_django import Value

csv_cols = {
    "names": ["name_0", "name_1"],
    "verified": ["true", "false"],
    "party": ["party_0", "party_1"],
    "id_persistent": [ce.id_persistent_test_0, "does_not_exist"],
}


@pytest.fixture
def delimiter_mock(mocker):
    delimiter_mock = mocker.MagicMock(return_value=",")
    mocker.patch("cosmae.contribution.column.queue.util.find_delimiter", delimiter_mock)
    return delimiter_mock


@pytest.fixture
def csv_mock(mocker):
    csv_mock = mocker.MagicMock(return_value=pd.DataFrame(csv_cols))
    mocker.patch("cosmae.contribution.column.queue.util.read_csv", csv_mock)
    return csv_mock


@pytest.fixture
def csv_mock_with_empty_lines(mocker):
    new_cols = {}
    for name, vals in csv_cols.items():
        new_vals = []
        for val in vals:
            new_vals.append(val)
            new_vals.append("")
            new_vals.append("\t\n")
            new_vals.append(None)
        new_cols[name] = new_vals
    csv_mock = mocker.MagicMock(return_value=pd.DataFrame(new_cols))
    mocker.patch("cosmae.contribution.column.queue.util.read_csv", csv_mock)
    return csv_mock


@pytest.fixture
def csv_mock_with_empty_values(mocker):
    new_cols = {}
    new_cols["names"] = csv_cols["names"]
    new_cols["verified"] = ["true", None]
    new_cols["party"] = ["party_0", None]
    csv_mock = mocker.MagicMock(return_value=pd.DataFrame(new_cols))
    mocker.patch("cosmae.contribution.column.queue.util.read_csv", csv_mock)
    return csv_mock


@pytest.fixture
def verified_column(db, user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name="column verified_test",
        id_parent_persistent=None,
        type=Column.BOOL,
        id_persistent=str(uuid4()),
        time_edit=timestamp(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def party_column(db, user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name="column party test",
        id_parent_persistent=None,
        type=Column.STRING,
        id_persistent=str(uuid4()),
        time_edit=timestamp(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def display_txt_contribution(contribution_other):
    return ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
        discard=False,
    )[0]


@pytest.fixture
def id_persistent_contribution(contribution_other):
    return ColumnContribution.objects.get_or_create(
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="name",
        id_existing_persistent="id_persistent",
        index_in_file=3,
        discard=False,
    )[0]


@pytest.fixture
def verified_contribution(
    contribution_other, verified_column, display_txt_contribution
):
    return ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="column_test",
        id_existing_persistent=verified_column.id_persistent,
        index_in_file=1,
        discard=False,
    )[0]


@pytest.fixture
def party_as_justification(contribution_other):
    return ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="justification_test",
        id_existing_persistent="justification",
        index_in_file=2,
        discard=False,
    )[0]


@pytest.fixture
def party_contribution(contribution_other, party_column, display_txt_contribution):
    return ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="column_test",
        id_existing_persistent=party_column.id_persistent,
        index_in_file=2,
        discard=False,
    )[0]


def test_ingest_empty_values(
    contribution_other,
    display_txt_contribution,
    verified_column,
    party_column,
    verified_contribution,
    party_contribution,
    csv_mock_with_empty_values,
    delimiter_mock,
):
    "Make sure entities with no imported values are not created."
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    ingest_values_from_csv(contribution_other.id_persistent)
    value_queryset = Value.objects.all()  # pylint: disable=no-member
    assert len(value_queryset) == 2
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0"}
    assert {value.id_entity_persistent for value in value_queryset} == {
        Entity.objects.get().id_persistent
    }
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.VALUES_EXTRACTED
    )


def get_value_by_mr(entity_name, id_column_persistent):
    origin_column = (
        column_objects()
        .filter(  # pylint: disable=no-member
            id_persistent=Subquery(
                ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
                    id_destination_persistent=id_column_persistent
                ).values_list("id_origin_persistent", flat=True)
            )
        )
        .get()
    )
    return (
        Value.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=Entity.objects.filter(  # pylint: disable=no-member
                display_txt=entity_name
            )
            .get()
            .id_persistent,
            id_column_persistent=origin_column.id_persistent,
        )
        .get()
        .value
    )


def test_ingest_boolean(
    verified_column,
    verified_contribution,
    csv_mock,
    delimiter_mock,
):
    contribution_other = verified_contribution.contribution_candidate
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_value_by_mr("name_0", verified_column.id_persistent) == "true"
    assert get_value_by_mr("name_1", verified_column.id_persistent) == "false"
    instances = Value.objects.all()  # pylint: disable=no-member
    assert len(instances) == 2
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.VALUES_EXTRACTED
    )


def test_ingest_string(party_column, party_contribution, csv_mock, delimiter_mock):
    contribution_other = party_contribution.contribution_candidate
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_value_by_mr("name_0", party_column.id_persistent) == "party_0"
    assert get_value_by_mr("name_1", party_column.id_persistent) == "party_1"
    instances = Value.objects.all()  # pylint: disable=no-member
    assert len(instances) == 2
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.VALUES_EXTRACTED
    )


def test_sets_error(party_contribution, party_column, mocker, delimiter_mock):
    mock = mocker.MagicMock()
    mock.side_effect = Exception("error")
    contribution = party_contribution.contribution_candidate
    with mocker.patch("cosmae.contribution.column.queue.util.read_csv", mock):
        ingest_values_from_csv(contribution.id_persistent)
    contribution = ContributionCandidate.by_id_persistent(
        contribution.id_persistent, contribution.created_by
    ).get()
    assert contribution.state == ContributionCandidate.COLUMNS_EXTRACTED
    assert contribution.error_msg == "Error during ingestion of assigned columns."
    assert contribution.error_trace == "Exception: error"


def test_ingest_with_empty(
    verified_column,
    verified_contribution,
    csv_mock_with_empty_lines,
    delimiter_mock,
):
    contribution_other = verified_contribution.contribution_candidate
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_value_by_mr("name_0", verified_column.id_persistent) == "true"
    assert get_value_by_mr("name_1", verified_column.id_persistent) == "false"
    instances = Value.objects.all()  # pylint: disable=no-member
    assert len(instances) == 2
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.VALUES_EXTRACTED
    )


def test_justification(
    verified_contribution, party_as_justification, csv_mock, delimiter_mock
):
    justifications = list(
        EntityJustification.objects.all()  # pylint: disable=no-member
    )
    assert len(justifications) == 0
    ingest_values_from_csv(verified_contribution.contribution_candidate.id_persistent)
    justifications = list(
        EntityJustification.objects.all()  # pylint: disable=no-member
    )
    assert len(justifications) == 2
    assert justifications[0].text != justifications[1].text
    assert {justification.text[:6] for justification in justifications} == {"party_"}


def test_maps_existing_id_persistent(
    id_persistent_contribution, csv_mock, delimiter_mock, entity0, party_contribution
):
    ingest_values_from_csv(
        id_persistent_contribution.contribution_candidate.id_persistent
    )
    entities = Entity.objects_all()
    assert len(entities) == 2
    value_entity = Value.objects.filter(
        id_entity_persistent=ce.id_persistent_test_0
    ).get()
    assert value_entity.value == "party_0"
    value_other = Value.objects.exclude(
        id_entity_persistent=ce.id_persistent_test_0
    ).get()
    assert value_other.value == "party_1"
