"Dispatch of queue functions for contribution candidates."
import django_rq

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.queue.create import read_csv_head
from cosmae.contribution.tag_definition.queue.ingest import ingest_values_from_csv


def dispatch_read_csv_head(
    sender,
    instance,
    created,
    update_fields,
    **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for extracting tags from columns."
    if created or (
        update_fields
        and "has_header" in update_fields
        and instance.state == ContributionCandidate.UPLOADED
    ):
        django_rq.enqueue(read_csv_head, str(instance.id_persistent))
    elif (
        update_fields
        and "state" in update_fields
        and instance.state == ContributionCandidate.COLUMNS_ASSIGNED
    ):
        django_rq.enqueue(ingest_values_from_csv, str(instance.id_persistent))
