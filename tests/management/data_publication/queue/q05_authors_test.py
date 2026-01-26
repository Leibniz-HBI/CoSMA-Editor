"Test the authors credits collection step of data publication."

# pylint: disable=unused-argument
from pytest import mark

from cosmae.management.data_publication.models_django import DataPublication
from cosmae.management.data_publication.queue.q05_authors import collect_authors_credits


@mark.django_db
def test_other_state(publication_user):
    "Make sure it does not run when not in AUTHORS step."
    collect_authors_credits(publication_user.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_user.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.step == DataPublication.Step.USER


@mark.django_db
def test_in_progress(publication_authors_working):
    "Make sure it does not run when already in progress."
    collect_authors_credits(publication_authors_working.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_authors_working.id_persistent
    )
    assert publication_db.is_working
    assert publication_db.step == DataPublication.Step.AUTHORS


@mark.django_db
def test_no_inputs(publication_authors):
    "Test that missing inputs result in an error state."
    collect_authors_credits(publication_authors.id_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=publication_authors.id_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.AUTHORS
    assert publication_db.error_message == "Could not find authors step input."
    assert publication_db.error_details == ""


@mark.django_db
def test_exception(publication_authors_input, mocker):
    "Test that exceptions are handled properly."
    id_publication_persistent = publication_authors_input.publication.id_persistent
    mocker.patch(
        "cosmae.management.data_publication.queue.q05_authors.get_authors_for_session",
        side_effect=Exception("Test exception"),
    )
    collect_authors_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert publication_db.is_error
    assert publication_db.step == DataPublication.Step.AUTHORS
    assert publication_db.error_message == "Could not collect authors credits."
    assert publication_db.error_details == "Test exception"


@mark.django_db
def test_successful_collection(publication_authors_input, user, user1):
    "Test that display text credits are collected successfully."
    id_publication_persistent = publication_authors_input.publication.id_persistent
    collect_authors_credits(id_publication_persistent)
    publication_db = DataPublication.objects.get(
        id_persistent=id_publication_persistent
    )
    assert not publication_db.is_working
    assert not publication_db.is_error
    assert publication_db.step == DataPublication.Step.PROCESSING_COMPLETED
    step_input = publication_db.results.filter(
        step=DataPublication.Step.PROCESSING_COMPLETED
    ).get()
    assert step_input.input == {
        "column_curated": [
            {
                "credits": 2,
                "name": user1.get_full_name(),
                "email": user1.email,
                "orcid": None,
            },
            {
                "credits": 2,
                "name": user.get_full_name(),
                "email": user.email,
                "orcid": None,
            },
        ],
        "column_user": [
            {
                "credits": 2,
                "name": user.get_full_name(),
                "email": user.email,
                "orcid": None,
            }
        ],
        "justification": [
            {
                "credits": 4,
                "name": user.get_full_name(),
                "email": user.email,
                "orcid": None,
            }
        ],
        "display_txt": [
            {
                "credits": 3,
                "name": user1.get_full_name(),
                "email": user1.email,
                "orcid": None,
            }
        ],
        "overall": [
            {
                "credits": 8,
                "name": user.get_full_name(),
                "email": user.email,
                "orcid": None,
            },
            {
                "credits": 5,
                "name": user1.get_full_name(),
                "email": user1.email,
                "orcid": None,
            },
        ],
    }
