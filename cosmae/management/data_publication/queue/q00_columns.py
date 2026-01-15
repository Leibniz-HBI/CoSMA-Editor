"Queue method for collecting columns for a dataset publication."

from django.db import transaction

from cosmae.column.models_django import ColumnHistory
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)


def collect_columns(id_publication):
    "Queue the column collection step for the given dataset publication."
    publication_query = DataPublication.objects.select_for_update().filter(
        id_persistent=id_publication
    )
    with transaction.atomic():
        publication = publication_query.first()
        if (
            publication is None
            or publication.is_working
            or publication.step != DataPublication.Step.CREATED
            or publication.is_error
        ):
            return
        publication.is_working = True
        publication.save()
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
            step=DataPublication.Step.DISPLAY_TXT,
            input={
                "columns": {
                    "user_list": list(
                        columns_user_queryset.values_list("id_persistent", flat=True)
                    ),
                    "curated_list": list(
                        columns_curated_queryset.values_list("id_persistent", flat=True)
                    ),
                }
            },
        )
    except Exception as exc:  # pylint: disable=broad-except
        publication_query.update(
            is_working=False,
            error_message="Failed to collect columns.",
            error_details=str(exc),
        )
