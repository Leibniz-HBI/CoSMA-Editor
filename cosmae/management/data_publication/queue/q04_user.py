"Collect user column credits for a dataset publication."

from logging import getLogger

from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)
from cosmae.management.data_publication.queue.utils import (
    check_publication_and_set_working,
    count_credits_versioned_queryset,
    process_data_publication_error,
    update_authors_input,
)
from cosmae.value.models_django import ValueHistory

_LOGGER = getLogger(__name__)


def collect_user_credits(id_publication):
    "Collect justification credits for the given dataset publication."
    publication_query = DataPublication.objects.filter(id_persistent=id_publication)
    publication = check_publication_and_set_working(
        publication_query, DataPublication.Step.USER
    )
    if publication is None:
        return
    try:
        inputs = DataPublicationStepInput.objects.filter(  # pylint: disable=no-member
            publication=publication, step=DataPublication.Step.USER
        ).first()
        if inputs is None:
            msg = "Could not find user step input."
            process_data_publication_error(publication, _LOGGER, msg, "")
            return
        id_columns_curated = inputs.input["id_columns_user_list"]
        credits_by_id = None
        for id_persistent in id_columns_curated:
            values = ValueHistory.objects.filter(id_column_persistent=id_persistent)
            credits_by_id = count_credits_versioned_queryset(
                values, publication, credits_by_id
            )
        update_authors_input(
            publication,
            DataPublication.Step.AUTHORS,
            credits_by_id,
            "user",
        )

    except (Exception,) as exc:  # pylint: disable=broad-except
        msg = "Could not collect user column credits."
        process_data_publication_error(publication, _LOGGER, msg, str(exc))
