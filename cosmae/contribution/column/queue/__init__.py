"Dispatch of queue functions for contribution candidates."

import django_rq

from cosmae.contribution.column.queue.create import read_csv_head
from cosmae.contribution.column.queue.ingest import ingest_values_from_csv
from cosmae.contribution.entity.queue import eliminate_duplicates
from cosmae.contribution.models_django import ContributionCandidate


def dispatch_read_csv_head(
    sender,
    instance,
    created,
    update_fields,
    **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for extracting values from columns."
    if created or (
        update_fields
        and ("has_header" in update_fields or "empty_values" in update_fields)
        and instance.state == ContributionCandidate.UPLOADED
    ):
        django_rq.enqueue(read_csv_head, str(instance.id_persistent))
        return
    if not (update_fields and "state" in update_fields):
        return
    if instance.state == ContributionCandidate.COLUMNS_ASSIGNED:
        django_rq.enqueue(ingest_values_from_csv, str(instance.id_persistent))
    elif instance.state == ContributionCandidate.ENTITIES_ASSIGNED:
        django_rq.enqueue(eliminate_duplicates, str(instance.id_persistent))
