"Manage queue methods for quality checks"

from datetime import timedelta
from uuid import uuid4

from django_rq import enqueue

from cosmae.column.models_django import column_objects
from cosmae.management.process.models_django import ProcessRun
from cosmae.quality.queue import find_duplicates_in_column
from cosmae.util import CosmaeUser, timestamp

_DUPLICATE_TASK_NAME = "find_duplicates_in_curated_columns"


def find_duplicates_in_curated_columns():
    """Find duplicates in all curated columns"""
    curated_columns = (
        column_objects().filter(curated=True).values_list("id_persistent", flat=True)
    )
    for id_curated_column in curated_columns:
        enqueue(
            find_duplicates_in_column,
            args=(id_curated_column,),
            job_timeout=3600,
            result_ttl=3600,
        )


def login_duplicate_signal(
    sender, request, user, **kwargs
):  # pylint: disable=unused-argument
    """Signal handler for user login to trigger duplicate checks"""
    if user.permission_group in {CosmaeUser.COMMISSIONER, CosmaeUser.EDITOR}:
        now = timestamp()
        last_run = (
            ProcessRun.objects.filter(process_name=_DUPLICATE_TASK_NAME)
            .order_by("-started_at")
            .first()
        )
        if last_run is None or (now - last_run.started_at) > timedelta(days=14):
            ProcessRun.objects.create(
                process_name=_DUPLICATE_TASK_NAME,
                started_at=now,
                id_persistent=uuid4(),
            )
            enqueue(
                find_duplicates_in_curated_columns, job_timeout=3600, result_ttl=3600
            )
