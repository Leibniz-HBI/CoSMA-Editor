"Tests for collecting display text credits for data publication."

# pylint: disable=unused-argument
from datetime import timedelta

from pytest import mark

from cosmae.management.data_publication.models_django import DataPublication
from cosmae.management.data_publication.queue.q01_display_txt import (
    collect_display_txt_credits,
)


@mark.django_db
def test_other_state(publication_created):
    "Make sure it does not run when not in DISPLAY_TXT step."
    collect_display_txt_credits(publication_created.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_created.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.step == DataPublication.Step.CREATED


@mark.django_db
def test_in_progress(publication_display_txt_working):
    "Make sure it does not run when already in progress."
    collect_display_txt_credits(publication_display_txt_working.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_display_txt_working.id_persistent
    )
    assert publication_db.is_working
    assert publication_db.step == DataPublication.Step.DISPLAY_TXT


@mark.django_db
def test_exception(publication_display_txt, mocker):
    "Test that exceptions are handled properly."
    id_publication_persistent = publication_display_txt.id_persistent
    mocker.patch(
        "cosmae.management.data_publication.queue."
        "q01_display_txt.count_credits_versioned_queryset",
        side_effect=Exception("Test exception"),
    )
    collect_display_txt_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.DISPLAY_TXT
    assert publication_db.error_message == "Could not collect display text credits."
    assert publication_db.error_details == "Test exception"


@mark.django_db
def test_successful_collection(publication_display_txt, entity0, entity1, entity2):
    "Test that display text credits are collected successfully."
    id_publication_persistent = publication_display_txt.id_persistent
    collect_display_txt_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert not publication_db.is_error
    assert publication_db.step == DataPublication.Step.JUSTIFICATION
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input["credits"]["display_txt"] == {
        entity0.written_by_session.id_persistent: 1,
        # sessions for 1 and 2 are the same
        entity1.written_by_session.id_persistent: 2,
    }
    assert step_input.input["metadata"]["display_txt"] == {}


@mark.django_db
def test_slicing(publication_display_txt, entity0, entity1, entity2):
    "Test that display text credits are collected successfully."
    publication_display_txt.start_time = entity1.time_edit - timedelta(seconds=1)
    publication_display_txt.end_time = entity1.time_edit
    publication_display_txt.save()
    id_publication_persistent = publication_display_txt.id_persistent
    collect_display_txt_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input["credits"]["display_txt"] == {
        entity1.written_by_session.id_persistent: 1,
    }
    assert step_input.input["metadata"]["display_txt"] == {}
