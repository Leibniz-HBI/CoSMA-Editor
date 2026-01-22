"Collect display text credits task."

from logging import getLogger

from cosmae.entity.models_django import EntityHistory
from cosmae.management.data_publication.models_django import DataPublication
from cosmae.management.data_publication.queue.utils import (
    check_publication_and_set_working,
    count_credits_versioned_queryset,
    process_data_publication_error,
    update_authors_input,
)

_LOGGER = getLogger(__name__)


def collect_display_txt_credits(id_publication):
    "Collect justification credits for the given dataset publication."
    publication_query = DataPublication.objects.filter(id_persistent=id_publication)
    publication = check_publication_and_set_working(
        publication_query, DataPublication.Step.DISPLAY_TXT
    )
    if publication is None:
        return
    try:

        credits_by_id = count_credits_versioned_queryset(
            EntityHistory.objects, publication
        )
        update_authors_input(
            publication,
            DataPublication.Step.JUSTIFICATION,
            credits_by_id,
            "display_txt",
        )

    except (Exception,) as exc:  # pylint: disable=broad-except
        msg = "Could not collect display text credits."
        process_data_publication_error(publication, _LOGGER, msg, str(exc))
