"Utils for data publication queue tasks."

from collections import defaultdict

from django.db import transaction
from django_rq import enqueue

from cosmae.column.models_django import column_objects
from cosmae.column.queue import get_column_name_path
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)
from cosmae.versioned.models_django import VersionedQueryset


def count_credits_by_key(history_slice, author_key, credits_by_id=None):
    "Count the number of author credits for a given history slice by author key."
    if credits_by_id is None:
        credits_by_id = defaultdict(int)
    for entry in history_slice.values(author_key):
        credits_by_id[entry[author_key]] += 1
    return credits_by_id


def count_credits_versioned_queryset(
    queryset: VersionedQueryset, publication: DataPublication, credits_by_id=None
):
    "Count the number of author credits for versioned items."
    history_slice = queryset.up_until(publication.end_time).after(
        publication.start_time
    )

    return count_credits_by_key(history_slice, "written_by_session_id", credits_by_id)


def update_authors_input(
    publication: DataPublication,
    step: DataPublication.Step,
    new_credits: dict,
    credits_key: str,
    metadata: dict | None = None,
):
    "Update the authors step input with new credits."
    try:
        inputs = DataPublicationStepInput.objects.filter(  # pylint: disable=no-member
            publication=publication, step=DataPublication.Step.AUTHORS
        ).get()
        inputs_dict = inputs.input
    except DataPublicationStepInput.DoesNotExist:
        inputs_dict = {"credits": {}, "metadata": {}}
    inputs_dict["credits"][credits_key] = new_credits
    if metadata is None:
        metadata = {}
    inputs_dict["metadata"][credits_key] = metadata
    with transaction.atomic():
        DataPublicationStepInput.objects.update_or_create(  # pylint: disable=no-member
            publication=publication,
            step=DataPublication.Step.AUTHORS,
            defaults={"input": inputs_dict},
        )
        publication.step = step
        publication.is_working = False
        publication.save()


def update_column_metadata(publication, id_persistent, values, metadata):
    "Add metadata for a column to the given metadata dict."
    column = (
        column_objects(publication.end_time)
        .filter(id_persistent=id_persistent)
        .most_recent()
        .first()
    )
    name_path = get_column_name_path(column, publication.end_time)
    metadata[id_persistent] = {
        "name_path": name_path,
        "name_string": " -> ".join(name_path),
        "description": column.description,
        "current_value_count": len(values.after(publication.start_time).most_recent()),
    }


_STEP_TO_FUNCTION_MAP = {
    DataPublication.Step.CREATED: (
        "cosmae.management.data_publication.queue.q00_columns.collect_columns"
    ),
    DataPublication.Step.DISPLAY_TXT: (
        "cosmae.management.data_publication.queue.q01_display_txt.collect_display_txt_credits"
    ),
    DataPublication.Step.JUSTIFICATION: (
        "cosmae.management.data_publication.queue.q02_justifications.collect_justification_credits"
    ),
    DataPublication.Step.CURATED: (
        "cosmae.management.data_publication.queue.q03_curated.collect_curated_credits"
    ),
    DataPublication.Step.USER: (
        "cosmae.management.data_publication.queue.q04_user.collect_user_credits"
    ),
    DataPublication.Step.AUTHORS: (
        "cosmae.management.data_publication.queue.q05_authors.collect_authors_credits"
    ),
}


def data_publication_signal_handler(  # pylint: disable=unused-argument
    sender, instance, created, **kwargs
):
    "Signal handler for triggering data publication steps."
    if instance.is_working or instance.is_error:
        return

    function = _STEP_TO_FUNCTION_MAP.get(instance.step)
    if function:
        enqueue(function, instance.id_persistent)


def check_publication_and_set_working(publication_query, expected_step):
    "Check if the publication is in the expected step and not working or in error."
    publication = publication_query.first()
    publication = publication_query.first()
    if (
        publication is None
        or publication.is_working
        or publication.step != expected_step
        or publication.is_error
    ):
        return None
    publication.is_working = True
    publication.save()
    return publication


def process_data_publication_error(publication, logger, msg, error_details):
    "Handling of errors during data publication processing."
    logger.error(msg, exc_info=error_details)
    publication.is_working = False
    publication.error_message = msg
    publication.error_details = error_details
    publication.save()
