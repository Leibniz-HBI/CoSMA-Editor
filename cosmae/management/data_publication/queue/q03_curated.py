"Collect curated column credits for data publication."

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


def collect_curated_credits(id_publication):
    "Collect justification credits for the given dataset publication."
    publication_query = DataPublication.objects.filter(id_persistent=id_publication)
    publication = check_publication_and_set_working(
        publication_query, DataPublication.Step.CURATED
    )
    if publication is None:
        return
    try:
        inputs_curated = (
            DataPublicationStepInput.objects.filter(  # pylint: disable=no-member
                publication=publication, step=DataPublication.Step.CURATED
            ).first()
        )
        if inputs_curated is None:
            msg = "Could not find curated step input."
            process_data_publication_error(publication, _LOGGER, msg, "")
            return
        id_columns_curated = inputs_curated.input["id_columns_curated_list"]
        credits_by_id = None
        for id_persistent in id_columns_curated:
            values = ValueHistory.objects.filter(id_column_persistent=id_persistent)
            credits_by_id = count_credits_versioned_queryset(
                values, publication, credits_by_id
            )
        update_authors_input(
            publication,
            DataPublication.Step.USER,
            credits_by_id,
            "column_curated",
        )

    except (Exception,) as exc:  # pylint: disable=broad-except
        msg = "Could not collect curated column credits."
        process_data_publication_error(publication, _LOGGER, msg, str(exc))
