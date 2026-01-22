"Test the user credits collection step of data publication."

# pylint: disable=unused-argument
from datetime import timedelta

from pytest import mark

from cosmae.management.data_publication.models_django import DataPublication
from cosmae.management.data_publication.queue.q04_user import collect_user_credits


@mark.django_db
def test_other_state(publication_curated):
    "Make sure it does not run when not in USER step."
    collect_user_credits(publication_curated.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_curated.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.step == DataPublication.Step.CURATED


@mark.django_db
def test_in_progress(publication_user_working):
    "Make sure it does not run when already in progress."
    collect_user_credits(publication_user_working.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_user_working.id_persistent
    )
    assert publication_db.is_working
    assert publication_db.step == DataPublication.Step.USER


@mark.django_db
def test_no_inputs(publication_user):
    "Test that missing inputs result in an error state."
    collect_user_credits(publication_user.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_user.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.USER
    assert publication_db.error_message == "Could not find user step input."
    assert publication_db.error_details == ""


@mark.django_db
def test_exception(publication_user_input, mocker):
    "Test that exceptions are handled properly."
    id_publication_persistent = publication_user_input.publication.id_persistent
    mocker.patch(
        "cosmae.management.data_publication.queue.q04_user.count_credits_versioned_queryset",
        side_effect=Exception("Test exception"),
    )
    collect_user_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.USER
    assert publication_db.error_message == "Could not collect user column credits."
    assert publication_db.error_details == "Test exception"


@mark.django_db
def test_successful_collection(publication_user_input, values_user):
    "Test that display text credits are collected successfully."
    id_publication_persistent = publication_user_input.publication.id_persistent
    collect_user_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert not publication_db.is_error
    assert publication_db.step == DataPublication.Step.AUTHORS
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input == {
        "credits": {
            "user": {
                values_user[0].written_by_session_id: 2,
                values_user[2].written_by_session_id: 2,
            }
        },
    }


@mark.django_db
def test_slicing(publication_user_input, values_user):
    "Test that user column credits are collected successfully."
    value0 = values_user[0]
    publication = publication_user_input.publication
    publication.start_time = value0.time_edit - timedelta(seconds=1)
    publication.end_time = value0.time_edit
    publication.save()
    id_publication_persistent = publication.id_persistent
    collect_user_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    step_input = publication_db.results.filter(step=DataPublication.Step.AUTHORS).get()
    assert step_input.input == {
        "credits": {
            "user": {
                value0.written_by_session_id: 1,
                values_user[2].written_by_session_id: 1,
            }
        },
    }
