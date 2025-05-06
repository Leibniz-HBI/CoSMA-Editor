# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pandas as pd
import pytest
from django.db.models import Subquery

from cosmae.column.models_django import Column, ColumnHistory
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.contribution.tag_definition.queue.ingest import ingest_values_from_csv
from cosmae.entity.models_django import Entity, EntityJustification
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.util import timestamp
from cosmae.value.models_django import Value

csv_cols = {
    "names": ["name_0", "name_1"],
    "verified": ["true", "false"],
    "party": ["party_0", "party_1"],
}


@pytest.fixture
def csv_mock():
    csv_mock = MagicMock()

    csv_mock.return_value = pd.DataFrame(csv_cols)
    return csv_mock


@pytest.fixture
def csv_mock_with_empty_lines():
    new_cols = {}
    for name, vals in csv_cols.items():
        new_vals = []
        for val in vals:
            new_vals.append(val)
            new_vals.append("")
            new_vals.append("\t\n")
            new_vals.append(None)
        new_cols[name] = new_vals
    csv_mock = MagicMock()
    csv_mock.return_value = pd.DataFrame(new_cols)
    return csv_mock


@pytest.fixture
def verified_tag_def(db, user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name="tag definition verified_test",
        id_parent_persistent=None,
        type=Column.BOOL,
        id_persistent=str(uuid4()),
        time_edit=timestamp(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def party_tag_def(db, user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        name="tag definition party test",
        id_parent_persistent=None,
        type=Column.STRING,
        id_persistent=str(uuid4()),
        time_edit=timestamp(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def display_txt_contribution(contribution_other):
    return TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
        discard=False,
    )[0]


@pytest.fixture
def verified_contribution(
    contribution_other, verified_tag_def, display_txt_contribution
):
    return TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="column_test",
        id_existing_persistent=verified_tag_def.id_persistent,
        index_in_file=1,
        discard=False,
    )[0]


@pytest.fixture
def party_as_justification(contribution_other):
    return TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="justification_test",
        id_existing_persistent="justification",
        index_in_file=2,
        discard=False,
    )[0]


@pytest.fixture
def party_contribution(contribution_other, party_tag_def, display_txt_contribution):
    return TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="column_test",
        id_existing_persistent=party_tag_def.id_persistent,
        index_in_file=2,
        discard=False,
    )[0]


def test_ingest_columns_names_only(
    contribution_other, display_txt_contribution, csv_mock
):
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    with patch("cosmae.contribution.tag_definition.queue.util.read_csv", csv_mock):
        with patch(
            "cosmae.contribution.tag_definition.queue.util.find_delimiter",
            return_value=",",
        ):
            ingest_values_from_csv(contribution_other.id_persistent)
    instances = Value.objects.all()  # pylint: disable=no-member
    assert len(instances) == 0
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.VALUES_EXTRACTED
    )


def get_tag_value_by_mr(entity_name, id_tag_persistent):
    origin_tag = Column.objects.filter(  # pylint: disable=no-member
        id_persistent=Subquery(
            ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
                id_destination_persistent=id_tag_persistent
            ).values_list("id_origin_persistent", flat=True)
        )
    ).get()
    return (
        Value.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=Entity.objects.filter(  # pylint: disable=no-member
                display_txt=entity_name
            )
            .get()
            .id_persistent,
            id_column_persistent=origin_tag.id_persistent,
        )
        .get()
        .value
    )


def test_ingest_inner(
    verified_tag_def,
    verified_contribution,
    csv_mock,
):
    contribution_other = verified_contribution.contribution_candidate
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    with patch("cosmae.contribution.tag_definition.queue.util.read_csv", csv_mock):
        with patch(
            "cosmae.contribution.tag_definition.queue.util.find_delimiter",
            return_value=",",
        ):
            ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_tag_value_by_mr("name_0", verified_tag_def.id_persistent) == "true"
    assert get_tag_value_by_mr("name_1", verified_tag_def.id_persistent) == "false"
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


def test_ingest_string(
    party_tag_def,
    party_contribution,
    csv_mock,
):
    contribution_other = party_contribution.contribution_candidate
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    with patch("cosmae.contribution.tag_definition.queue.util.read_csv", csv_mock):
        with patch(
            "cosmae.contribution.tag_definition.queue.util.find_delimiter",
            return_value=",",
        ):
            ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_tag_value_by_mr("name_0", party_tag_def.id_persistent) == "party_0"
    assert get_tag_value_by_mr("name_1", party_tag_def.id_persistent) == "party_1"
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


def test_sets_error(party_contribution, party_tag_def):
    mock = MagicMock()
    mock.side_effect = Exception("error")
    contribution = party_contribution.contribution_candidate
    with patch("cosmae.contribution.tag_definition.queue.util.read_csv", mock):
        with patch(
            "cosmae.contribution.tag_definition.queue.util.find_delimiter",
            return_value=",",
        ):
            ingest_values_from_csv(contribution.id_persistent)
    contribution = ContributionCandidate.by_id_persistent(
        contribution.id_persistent, contribution.created_by
    ).get()
    assert contribution.state == ContributionCandidate.COLUMNS_EXTRACTED
    assert contribution.error_msg == "Error during ingestion of assigned tags."
    assert contribution.error_trace == "Exception: error"


def test_ingest_with_empty(
    verified_tag_def,
    verified_contribution,
    csv_mock_with_empty_lines,
):
    contribution_other = verified_contribution.contribution_candidate
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    with patch(
        "cosmae.contribution.tag_definition.queue.util.read_csv",
        csv_mock_with_empty_lines,
    ):
        with patch(
            "cosmae.contribution.tag_definition.queue.util.find_delimiter",
            return_value=",",
        ):
            ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Entity.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_tag_value_by_mr("name_0", verified_tag_def.id_persistent) == "true"
    assert get_tag_value_by_mr("name_1", verified_tag_def.id_persistent) == "false"
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


def test_justification(verified_contribution, party_as_justification, csv_mock):
    justifications = list(
        EntityJustification.objects.all()  # pylint: disable=no-member
    )
    assert len(justifications) == 0
    with patch(
        "cosmae.contribution.tag_definition.queue.util.read_csv",
        csv_mock,
    ):
        with patch(
            "cosmae.contribution.tag_definition.queue.util.find_delimiter",
            return_value=",",
        ):
            ingest_values_from_csv(
                verified_contribution.contribution_candidate.id_persistent
            )
    justifications = list(
        EntityJustification.objects.all()  # pylint: disable=no-member
    )
    assert len(justifications) == 2
    assert justifications[0].text != justifications[1].text
    assert {justification.text[:6] for justification in justifications} == {"party_"}
