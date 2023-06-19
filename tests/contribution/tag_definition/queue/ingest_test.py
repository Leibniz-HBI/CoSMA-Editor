# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pandas as pd
import pytest

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.contribution.tag_definition.queue.ingest import ingest_values_from_csv
from cosmae.person.models_django import Person
from cosmae.tag.models_django import TagDefinition, TagInstance


@pytest.fixture
def csv_mock():
    csv_mock = MagicMock()
    csv_mock.return_value = pd.DataFrame(
        {
            "names": ["name_0", "name_1"],
            "verified": ["true", "false"],
            "party": ["party_0", "party_1"],
        }
    )
    return csv_mock


@pytest.fixture
def verified_tag_def(db):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name="tag definition verified_test",
        id_parent_persistent=None,
        type=TagDefinition.INNER,
        id_persistent=str(uuid4()),
        time_edit=datetime.now(),
    )


@pytest.fixture
def party_tag_def(db):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name="tag definition party test",
        id_parent_persistent=None,
        type=TagDefinition.STRING,
        id_persistent=str(uuid4()),
        time_edit=datetime.now(),
    )


@pytest.fixture
def display_txt_contribution(contribution_other):
    return TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
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
    )[0]


@pytest.fixture
def party_contribution(contribution_other, party_tag_def, display_txt_contribution):
    return TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_other,
        name="column_test",
        id_existing_persistent=party_tag_def.id_persistent,
        index_in_file=2,
    )[0]


def test_ingest_columns_names_only(
    contribution_other, display_txt_contribution, csv_mock
):
    contribution_other.state = ContributionCandidate.COLUMNS_EXTRACTED
    contribution_other.save()
    with patch("cosmae.contribution.tag_definition.queue.util.read_csv", csv_mock):
        ingest_values_from_csv(contribution_other.id_persistent)
    instances = TagInstance.objects.all()  # pylint: disable=no-member
    assert len(instances) == 0
    persons = set(
        Person.objects.values_list(  # pylint: disable=no-member
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
        == ContributionCandidate.MERGED
    )


def get_tag_value(entity_name, id_tag_persistent):

    return (
        TagInstance.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=Person.objects.filter(display_txt=entity_name)
            .get()
            .id_persistent,
            id_tag_definition_persistent=id_tag_persistent,
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
        ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Person.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_tag_value("name_0", verified_tag_def.id_persistent) == "true"
    assert get_tag_value("name_1", verified_tag_def.id_persistent) == "false"
    instances = TagInstance.objects.all()  # pylint: disable=no-member
    assert len(instances) == 2
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.MERGED
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
        ingest_values_from_csv(contribution_other.id_persistent)
    persons = set(
        Person.objects.values_list(  # pylint: disable=no-member
            "display_txt", flat=True
        )
    )
    assert persons == {"name_0", "name_1"}
    assert get_tag_value("name_0", party_tag_def.id_persistent) == "party_0"
    assert get_tag_value("name_1", party_tag_def.id_persistent) == "party_1"
    instances = TagInstance.objects.all()  # pylint: disable=no-member
    assert len(instances) == 2
    assert (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
        .get()
        .state
        == ContributionCandidate.MERGED
    )
