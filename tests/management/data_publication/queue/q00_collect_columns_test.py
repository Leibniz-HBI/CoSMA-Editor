"Tests for collecting columns for data publication."

# pylint: disable=unused-argument,redefined-outer-name
from datetime import timedelta

from pytest import fixture

import cosmae.management.data_publication.queue.q00_columns as q
import tests.column.common as cc
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)


@fixture
def publication_created_curated_only(publication_created):
    "Data publication with start date excluding the user column."
    publication_created.start_time = cc.time_edit_curated_test - timedelta(minutes=1)
    publication_created.save()
    return publication_created


@fixture
def mock_data_publication_filter(mocker):
    "Mock data publication related models."
    return mocker.patch.object(
        DataPublication.objects,
        "filter",
    )


def test_cancels_if_publication_not_found(db, mock_data_publication_filter):
    "Test that nothing is computed when the publication is not found."
    q.collect_columns(9999)
    mock_data_publication_filter.assert_called_once()


def test_cancels_if_already_working(
    db,
    publication_created_working,
    mock_data_publication_filter,
):
    "Test that nothing is computed when the publication is already working."
    q.collect_columns(publication_created_working.id_persistent)
    mock_data_publication_filter.assert_called_once()


def tests_cancels_if_not_in_created_step(
    db,
    publication_display_txt,
    mock_data_publication_filter,
):
    "Test that nothing is computed when the publication is not in created step."
    q.collect_columns(publication_display_txt.id_persistent)
    mock_data_publication_filter.assert_called_once()


def test_collects_columns_successfully(
    column_curated,
    column_user,
    publication_created,
):
    "Test that columns are collected successfully."
    q.collect_columns(publication_created.id_persistent)
    publication = DataPublication.objects.get(
        id_persistent=publication_created.id_persistent
    )
    assert publication.step == DataPublication.Step.DISPLAY_TXT
    assert not publication.is_working
    assert not publication.is_error
    curated_input = DataPublicationStepInput.objects.filter(
        publication=publication, step=DataPublication.Step.CURATED
    ).get()
    assert curated_input.input == {
        "id_columns_curated_list": [column_curated.id_persistent],
    }

    user_input = DataPublicationStepInput.objects.filter(
        publication=publication, step=DataPublication.Step.USER
    ).get()
    assert user_input.input == {
        "id_columns_user_list": [column_user.id_persistent],
    }


def test_collects_columns_curated_only_successfully(
    column_curated,
    column_user,
    publication_created_curated_only,
):
    "Test that collected columns respect time span."
    q.collect_columns(publication_created_curated_only.id_persistent)
    publication = DataPublication.objects.get(
        id_persistent=publication_created_curated_only.id_persistent
    )
    assert publication.step == DataPublication.Step.DISPLAY_TXT
    assert not publication.is_working
    assert not publication.is_error
    curated_input = DataPublicationStepInput.objects.filter(
        publication=publication, step=DataPublication.Step.CURATED
    ).get()
    assert curated_input.input == {
        "id_columns_curated_list": [column_curated.id_persistent],
    }

    user_input = DataPublicationStepInput.objects.filter(
        publication=publication, step=DataPublication.Step.USER
    ).get()
    assert user_input.input == {
        "id_columns_user_list": [],
    }
