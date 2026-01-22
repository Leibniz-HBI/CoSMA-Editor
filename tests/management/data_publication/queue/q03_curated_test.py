"Test the curated credits collection step of data publication."

# pylint: disable=unused-argument
from datetime import timedelta

from pytest import mark

from cosmae.management.data_publication.models_django import DataPublication
from cosmae.management.data_publication.queue.q03_curated import collect_curated_credits


@mark.django_db
def test_other_state(publication_justification):
    "Make sure it does not run when not in CURATED step."
    collect_curated_credits(publication_justification.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_justification.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.step == DataPublication.Step.JUSTIFICATION


@mark.django_db
def test_in_progress(publication_curated_working):
    "Make sure it does not run when already in progress."
    collect_curated_credits(publication_curated_working.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_curated_working.id_persistent
    )
    assert publication_db.is_working
    assert publication_db.step == DataPublication.Step.CURATED


@mark.django_db
def test_no_inputs(publication_curated):
    "Test that missing inputs result in an error state."
    collect_curated_credits(publication_curated.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_curated.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.CURATED
    assert publication_db.error_message == "Could not find curated step input."
    assert publication_db.error_details == ""


@mark.django_db
def test_exception(publication_curated_input, mocker):
    "Test that exceptions are handled properly."
    id_publication_persistent = publication_curated_input.publication.id_persistent
    mocker.patch(
        "cosmae.management.data_publication.queue.q03_curated.count_credits_versioned_queryset",
        side_effect=Exception("Test exception"),
    )
    collect_curated_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.CURATED
    assert publication_db.error_message == "Could not collect curated column credits."
    assert publication_db.error_details == "Test exception"


@mark.django_db
def test_successful_collection(publication_curated_input, values_curated):
    "Test that display text credits are collected successfully."
    id_publication_persistent = publication_curated_input.publication.id_persistent
    collect_curated_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert not publication_db.is_error
    assert publication_db.step == DataPublication.Step.USER
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input == {
        "credits": {
            "curated": {
                values_curated[0].written_by_session_id: 2,
                values_curated[2].written_by_session_id: 2,
            }
        },
    }


@mark.django_db
def test_slicing(publication_curated_input, values_curated):
    "Test that display text credits are collected successfully."
    value0 = values_curated[0]
    publication = publication_curated_input.publication
    publication.start_time = value0.time_edit - timedelta(seconds=1)
    publication.end_time = value0.time_edit
    publication.save()
    id_publication_persistent = publication.id_persistent
    collect_curated_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input == {
        "credits": {
            "curated": {
                value0.written_by_session_id: 1,
                values_curated[2].written_by_session_id: 1,
            }
        },
    }
