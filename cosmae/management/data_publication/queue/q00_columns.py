"Queue method for collecting columns for a dataset publication."

from logging import getLogger

from cosmae.column.models_django import ColumnHistory
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)
from cosmae.management.data_publication.queue.utils import (
    check_publication_and_set_working,
    process_data_publication_error,
)

_LOGGER = getLogger(__name__)


def collect_columns(id_publication):
    "Queue the column collection step for the given dataset publication."
    publication_query = DataPublication.objects.filter(id_persistent=id_publication)
    publication = check_publication_and_set_working(
        publication_query, DataPublication.Step.CREATED
    )
    if publication is None:
        return
    try:
        column_queryset = (
            ColumnHistory.objects
            # if the column was not disabled at one time we still need to count it
            .filter(disabled=False)
            .up_until(publication.end_time)
            .after(publication.start_time)
            .filter(disabled=False)
            .most_recent()
        )
        columns_curated_queryset = column_queryset.filter(curated=True)
        columns_user_queryset = column_queryset.filter(curated=False)
        publication.step = DataPublication.Step.DISPLAY_TXT
        publication.is_working = False
        publication.save()
        DataPublicationStepInput.objects.create(
            publication=publication,
            step=DataPublication.Step.CURATED,
            input={
                "id_columns_curated_list": list(
                    columns_curated_queryset.values_list("id_persistent", flat=True)
                ),
            },
        )
        DataPublicationStepInput.objects.create(
            publication=publication,
            step=DataPublication.Step.USER,
            input={
                "id_columns_user_list": list(
                    columns_user_queryset.values_list("id_persistent", flat=True)
                ),
            },
        )
    except Exception as exc:  # pylint: disable=broad-except
        process_data_publication_error(
            publication,
            _LOGGER,
            "Failed to collect columns.",
            str(exc),
        )
