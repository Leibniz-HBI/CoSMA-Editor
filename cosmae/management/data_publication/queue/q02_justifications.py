"Collect justification credits for data publication."

from logging import getLogger

from django.db.models.functions import Coalesce

from cosmae.justification.models_django import EntityJustification
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)
from cosmae.management.data_publication.queue.utils import (
    check_publication_and_set_working,
    count_credits_by_key,
    process_data_publication_error,
    update_authors_input,
)

_LOGGER = getLogger(__name__)


def collect_justification_credits(id_publication):
    "Collect justification credits for the given dataset publication."
    publication_query = DataPublication.objects.filter(id_persistent=id_publication)
    publication = check_publication_and_set_working(
        publication_query, DataPublication.Step.JUSTIFICATION
    )
    if publication is None:
        return
    try:
        inputs = DataPublicationStepInput.objects.filter(  # pylint: disable=no-member
            publication=publication, step=DataPublication.Step.AUTHORS
        ).first()
        if inputs is None:
            msg = "Could not find justification step input."
            process_data_publication_error(publication, _LOGGER, msg, "")
            return
        justifications = EntityJustification.objects.filter(
            timestamp__gt=publication.start_time, timestamp__lte=publication.end_time
        ).annotate(
            author_id_with_fallback=Coalesce(
                "author_session_id", "author__id_persistent"
            )
        )
        credits_by_id = count_credits_by_key(justifications, "author_id_with_fallback")
        update_authors_input(
            publication, DataPublication.Step.CURATED, credits_by_id, "justification"
        )

    except (Exception,) as exc:  # pylint: disable=broad-except
        msg = "Could not collect justification credits."
        process_data_publication_error(publication, _LOGGER, msg, str(exc))
