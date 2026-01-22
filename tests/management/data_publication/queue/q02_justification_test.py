"Test the justification credits collection step of data publication."

# pylint: disable=unused-argument
from datetime import timedelta

from pytest import mark

from cosmae.management.data_publication.models_django import DataPublication
from cosmae.management.data_publication.queue.q02_justifications import (
    collect_justification_credits,
)


@mark.django_db
def test_other_state(publication_display_txt):
    "Make sure it does not run when not in JUSTIFICATION step."
    collect_justification_credits(publication_display_txt.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_display_txt.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.step == DataPublication.Step.DISPLAY_TXT


@mark.django_db
def test_in_progress(publication_justification_working):
    "Make sure it does not run when already in progress."
    collect_justification_credits(publication_justification_working.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_justification_working.id_persistent
    )
    assert publication_db.is_working
    assert publication_db.step == DataPublication.Step.JUSTIFICATION


@mark.django_db
def test_no_inputs(publication_justification):
    "Test that missing inputs result in an error state."
    collect_justification_credits(publication_justification.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_justification.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.JUSTIFICATION
    assert publication_db.error_message == "Could not find justification step input."
    assert publication_db.error_details == ""


@mark.django_db
def test_exception(publication_justification_input, mocker):
    "Test that exceptions are handled properly."
    id_publication_persistent = (
        publication_justification_input.publication.id_persistent
    )
    mocker.patch(
        "cosmae.management.data_publication.queue.q02_justifications.count_credits_by_key",
        side_effect=Exception("Test exception"),
    )
    collect_justification_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.JUSTIFICATION
    assert publication_db.error_message == "Could not collect justification credits."
    assert publication_db.error_details == "Test exception"


@mark.django_db
def test_successful_collection(
    publication_justification_input, justification0, justification1, justification2
):
    "Test that display text credits are collected successfully."
    id_publication_persistent = (
        publication_justification_input.publication.id_persistent
    )
    collect_justification_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert not publication_db.is_error
    assert publication_db.step == DataPublication.Step.CURATED
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input["credits"]["justification"] == {
        # authors for 0 and 2 are the same
        justification0.author.id_persistent: 2,
        justification1.author.id_persistent: 1,
    }


@mark.django_db
def test_slicing(
    publication_justification_input, justification0, justification1, justification2
):
    "Test that display text credits are collected successfully."
    publication = publication_justification_input.publication
    publication.start_time = justification1.timestamp - timedelta(seconds=1)
    publication.end_time = justification1.timestamp
    publication.save()
    id_publication_persistent = publication.id_persistent
    collect_justification_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input["credits"]["justification"] == {
        justification1.author.id_persistent: 1,
    }
