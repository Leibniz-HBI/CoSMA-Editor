# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cosmae.contribution.column.models_django import ColumnContribution
from cosmae.contribution.column.queue.create import read_csv_head
from cosmae.contribution.models_django import ContributionCandidate


def test_deletes_existing_column(contribution_column):
    conf_mock = MagicMock
    conf_mock.CONTRIBUTION_DIRECTORY = "tests/files/"
    with patch("cosmae.contribution.column.queue.util.settings", conf_mock):
        read_csv_head(contribution_column.contribution_candidate.id_persistent)
    with pytest.raises(ColumnContribution.DoesNotExist):  # pylint: disable=no-member
        ColumnContribution.objects.get(  # pylint: disable=no-member
            id_persistent=contribution_column.id_persistent
        )


def test_extracts_without_header(contribution_user):
    conf_mock = MagicMock
    conf_mock.CONTRIBUTION_DIRECTORY = "tests/files/"
    with patch("cosmae.contribution.column.queue.util.settings", conf_mock):
        read_csv_head(contribution_user.id_persistent)
    columns = ColumnContribution.objects.all()  # pylint: disable=no-member
    for idx, column in enumerate(columns):
        assert column.name == str(idx)


_expected_columns = [
    "id",
    "Kategorie",
    "Name",
    "Partei",
    "Wahlkreis",
    "Geschlecht",
    "Kommentar",
    "Bild",
    "tags",
    "Wikipedia_URL",
    "Homepage_URL",
    "SM_Twitter_user",
    "SM_Twitter_id",
    "SM_Twitter_verifiziert",
    "SM_Facebook_id",
    "SM_Facebook_user",
    "SM_Facebook_verifiziert",
    "SM_Youtube_user",
    "SM_Youtube_id",
    "SM_Youtube_verifiziert",
    "SM_Instagram_user",
    "SM_Instagram_id",
    "SM_Instagram_verifiziert",
    "SM_Telegram_user",
    "SM_Telegram_id",
    "SM_Telegram_verifiziert",
    "created_at",
    "created_by",
    "modified_at",
    "modified_by",
]


def test_extracts_with_header(contribution_other):
    conf_mock = MagicMock
    conf_mock.CONTRIBUTION_DIRECTORY = Path("tests/files/")
    with patch("cosmae.contribution.column.queue.util.settings", conf_mock):
        read_csv_head(contribution_other.id_persistent)
    columns = ColumnContribution.objects.all()  # pylint: disable=no-member
    for idx, column in enumerate(columns):
        assert column.name == _expected_columns[idx]
    contribution_candidate = (
        ContributionCandidate.objects.get(  # pylint: disable=no-member
            id_persistent=contribution_other.id_persistent
        )
    )
    assert contribution_candidate.state == ContributionCandidate.COLUMNS_EXTRACTED


def test_extracts_with_header_semicolon(contribution_semicolon):
    conf_mock = MagicMock
    conf_mock.CONTRIBUTION_DIRECTORY = Path("tests/files/")
    with patch("cosmae.contribution.column.queue.util.settings", conf_mock):
        read_csv_head(contribution_semicolon.id_persistent)
    columns = ColumnContribution.objects.all()  # pylint: disable=no-member
    for idx, column in enumerate(columns):
        assert column.name == _expected_columns[idx]
    contribution_candidate = (
        ContributionCandidate.objects.get(  # pylint: disable=no-member
            id_persistent=contribution_semicolon.id_persistent
        )
    )
    assert contribution_candidate.state == ContributionCandidate.COLUMNS_EXTRACTED


def test_sets_error(contribution_other):
    conf_mock = MagicMock
    conf_mock.CONTRIBUTION_DIRECTORY = Path("tests/files/does_not_exist")
    with patch("cosmae.contribution.column.queue.util.settings", conf_mock):
        read_csv_head(contribution_other.id_persistent)
    contribution = ContributionCandidate.by_id_persistent(
        contribution_other.id_persistent, contribution_other.created_by
    ).get()
    assert contribution.state == ContributionCandidate.UPLOADED
    assert contribution.error_msg == "Error while extracting columns."
    assert contribution.error_trace == (
        "FileNotFoundError: [Errno 2] No such file or directory: "
        "'tests/files/does_not_exist/DBOeS_Parlamentarier50.csv'"
    )
