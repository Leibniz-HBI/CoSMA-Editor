"""Queue methods for columns and values"""

from typing import List, Optional

from django.db import transaction
from django.db.utils import OperationalError
from django_rq import enqueue

from cosmae.column.models_django import Column, ColumnHistory, ColumnNamePathCache
from cosmae.entity.queue import update_display_txt_cache


def get_column_name_path(column: Column):
    """Get the name path of a column.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    return get_column_name_path_from_parts(column.id, column.name)


def get_column_name_path_from_parts(id_column: int, name: str):
    """Get the name path of a column using its id_persistent and name.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    try:
        name_path = (
            ColumnNamePathCache.objects.filter(column_id=id_column)
            .values_list("name_path", flat=True)
            .get()
        )
    except ColumnNamePathCache.DoesNotExist:
        name_path = [name]
        enqueue(update_column_name_path, id_column)
    return name_path


def update_column_name_path(id_column, parent_name_path: Optional[List[str]] = None):
    """Update the name path cache entry for the column referenced by its persistent id.
    If the name path of the parent is already known it can be provided as an optional parameter.
    """
    column_query = ColumnHistory.objects.by_id_version(id_column)
    try:
        with transaction.atomic():
            try:
                column = column_query.get()
            except OperationalError:
                return
            history_up_until_column = ColumnHistory.objects.up_until(
                column.time_edit
            ).most_recent()
            if parent_name_path is None:
                if column.id_parent_persistent is None:
                    parent_name_path = []
                else:
                    parent_name_path = (
                        history_up_until_column.by_id_persistent(
                            column.id_parent_persistent
                        )
                        .values("name_path")
                        .get()
                    )
            name_path = parent_name_path + [column.name]
            ColumnNamePathCache.set_cache_entry(
                column.id,
                name_path,
            )
            children = history_up_until_column.children(column.id_persistent)
            for child in children:
                if not child.disabled:
                    enqueue(update_column_name_path, child.id, name_path)

    except Exception:  # pylint: disable=broad-except
        return


def dispatch_column_queue_process(
    sender,
    instance,
    created,
    update_fields,
    **kwargs,  # pylint: disable=unused-argument
):
    "Dispatches queue methods for columns on save."
    if not (
        created
        or (
            update_fields
            and ("id_persistent" in update_fields or "name" in update_fields)
        )
    ):
        return
    enqueue(update_column_name_path, str(instance))


def dispatch_display_txt_queue_process(
    sender,
    instance,
    created,
    update_fields,
    **kwargs,  # pylint: disable=unused-argument
):
    "Dispatch method for updating entity display txt, when entity has changed."
    if created or (update_fields and "value" in update_fields):
        enqueue(update_display_txt_cache, str(instance.id_persistent))
