# pylint: disable=redefined-outer-name,duplicate-code
"Fixtures for data publication tests."

from pytest import fixture

import tests.column.common as cc
import tests.edit_session.common as cs
import tests.management.data_publication.common as c
import tests.user.common as cu
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)


@fixture()
def publication_created():
    "Freshly created data publication."
    return DataPublication.objects.create(
        name=c.created_name,
        start_time=c.created_start_date,
        end_time=c.created_end_date,
        id_persistent=c.created_id_persistent,
    )


@fixture()
def publication_created_working():
    "Data publication that is currently being worked on."
    return DataPublication.objects.create(
        name=c.working_name,
        start_time=c.working_start_date,
        end_time=c.working_end_date,
        id_persistent=c.working_id_persistent,
        is_working=True,
    )


@fixture()
def publication_display_txt():
    "Data publication in display text step."
    return DataPublication.objects.create(
        name=c.display_txt_name,
        start_time=c.display_txt_start_date,
        end_time=c.display_txt_end_date,
        id_persistent=c.display_txt_id_persistent,
        step=DataPublication.Step.DISPLAY_TXT,
    )


@fixture()
def publication_display_txt_working():
    "Data publication in display text step."
    return DataPublication.objects.create(
        name=c.display_txt_name,
        start_time=c.display_txt_start_date,
        end_time=c.display_txt_end_date,
        id_persistent=c.display_txt_id_persistent,
        step=DataPublication.Step.DISPLAY_TXT,
        is_working=True,
    )


@fixture()
def publication_justification():
    "Data publication in justification step."
    return DataPublication.objects.create(
        name=c.justification_name,
        start_time=c.justification_start_date,
        end_time=c.justification_end_date,
        id_persistent=c.justification_id_persistent,
        step=DataPublication.Step.JUSTIFICATION,
    )


@fixture()
def publication_justification_working():
    "Data publication in justification step."
    return DataPublication.objects.create(
        name=c.justification_name,
        start_time=c.justification_start_date,
        end_time=c.justification_end_date,
        id_persistent=c.justification_id_persistent,
        step=DataPublication.Step.JUSTIFICATION,
        is_working=True,
    )


@fixture()
def publication_justification_input(publication_justification):
    "Input for display text step."
    return DataPublicationStepInput.objects.create(
        publication=publication_justification,
        step=DataPublication.Step.AUTHORS,
        # credits is assumed to exist from display text step.
        input={"credits": {}, "metadata": {}},
    )


@fixture()
def publication_curated():
    "Data publication in curated step."
    return DataPublication.objects.create(
        name=c.curated_name,
        start_time=c.curated_start_date,
        end_time=c.curated_end_date,
        id_persistent=c.curated_id_persistent,
        step=DataPublication.Step.CURATED,
    )


@fixture()
def publication_curated_working():
    "Data publication in curated step."
    return DataPublication.objects.create(
        name=c.curated_name,
        start_time=c.curated_start_date,
        end_time=c.curated_end_date,
        id_persistent=c.curated_id_persistent,
        step=DataPublication.Step.CURATED,
        is_working=True,
    )


@fixture()
def publication_curated_input(publication_curated):
    "Input for display text step."
    DataPublicationStepInput.objects.create(
        publication=publication_curated,
        step=DataPublication.Step.AUTHORS,
        # credits is assumed to exist from display text step.
        input={"credits": {}, "metadata": {}},
    )
    return DataPublicationStepInput.objects.create(
        publication=publication_curated,
        step=DataPublication.Step.CURATED,
        # credits is assumed to exist from display text step.
        input={"id_columns_curated_list": [cc.id_column_curated_test]},
    )


@fixture()
def publication_user():
    "Data publication in user step."
    return DataPublication.objects.create(
        name=c.user_name,
        start_time=c.user_start_date,
        end_time=c.user_end_date,
        id_persistent=c.user_id_persistent,
        step=DataPublication.Step.USER,
    )


@fixture()
def publication_user_working():
    "Data publication in user step."
    return DataPublication.objects.create(
        name=c.user_name,
        start_time=c.user_start_date,
        end_time=c.user_end_date,
        id_persistent=c.user_id_persistent,
        step=DataPublication.Step.USER,
        is_working=True,
    )


@fixture()
def publication_user_input(publication_user):
    "Input for display text step."
    DataPublicationStepInput.objects.create(
        publication=publication_user,
        step=DataPublication.Step.AUTHORS,
        # credits is assumed to exist from display text step.
        input={"credits": {}, "metadata": {}},
    )
    return DataPublicationStepInput.objects.create(
        publication=publication_user,
        step=DataPublication.Step.USER,
        # credits is assumed to exist from display text step.
        input={
            "id_columns_user_list": [
                cc.id_column_persistent_test_user,
                cc.id_column_persistent_test_user1,
            ]
        },
    )


@fixture()
def publication_authors():
    "Data publication in authors step."
    return DataPublication.objects.create(
        name=c.authors_name,
        start_time=c.authors_start_date,
        end_time=c.authors_end_date,
        id_persistent=c.authors_id_persistent,
        step=DataPublication.Step.AUTHORS,
    )


@fixture()
def publication_authors_working():
    "Data publication in authors step."
    return DataPublication.objects.create(
        name=c.authors_name,
        start_time=c.authors_start_date,
        end_time=c.authors_end_date,
        id_persistent=c.authors_id_persistent,
        step=DataPublication.Step.AUTHORS,
        is_working=True,
    )


@fixture()
def publication_authors_input(publication_authors):
    "Input for authors step."
    return DataPublicationStepInput.objects.create(
        publication=publication_authors,
        step=DataPublication.Step.AUTHORS,
        # credits is assumed to exist from display text step.
        input={
            "credits": {
                "column_user": {cu.test_uuid: 2},
                "column_curated": {cu.test_uuid1: 2, cs.id_session_user: 2},
                "justification": {cu.test_uuid: 2, cs.id_session_user: 2},
                "display_txt": {cu.test_uuid1: 3},
            },
            "metadata": c.metadata_test,
        },
    )


@fixture()
def publication_completed():
    "Data publication in authors step."
    return DataPublication.objects.create(
        name=c.authors_name,
        start_time=c.authors_start_date,
        end_time=c.authors_end_date,
        id_persistent=c.authors_id_persistent,
        step=DataPublication.Step.PROCESSING_COMPLETED,
    )


@fixture()
def publication_completed_input(publication_completed):
    "Input for authors step."
    return DataPublicationStepInput.objects.create(
        publication=publication_completed,
        step=DataPublication.Step.PROCESSING_COMPLETED,
        # credits is assumed to exist from display text step.
        input={
            "column_curated": [],
            "column_user": [],
            "justification": [],
            "display_txt": [],
            "overall": [],
        },
    )
