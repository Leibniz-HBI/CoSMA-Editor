"""Queue methods for columns and values"""

from typing import List, Optional

from django.core.cache import caches
from django.db import transaction
from django.db.utils import OperationalError
from django_rq import enqueue

from cosmae.column.models_django import Column
from cosmae.entity.queue import update_display_txt_cache

column_name_path_cache = caches["column_name_paths"]


def get_column_name_path(column: Column):
    """Get the name path of a column.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    return get_column_name_path_from_parts(column.id_persistent, column.name)


def get_column_name_path_from_parts(id_persistent: str, name: str):
    """Get the name path of a column using its id_persistent and name.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    name_path = column_name_path_cache.get(id_persistent)
    if name_path is None:
        name_path = [name]
        enqueue(update_column_name_path, id_persistent)
    return name_path


def update_column_name_path(
    id_column_persistent, parent_name_path: Optional[List[str]] = None
):
    """Update the name path cache entry for the column referenced by its persistent id.
    If the name path of the parent is already known it can be provided as an optional parameter.
    """
    column_query = Column.most_recent_by_id_query_set(id_column_persistent)
    try:
        with transaction.atomic():
            try:
                column = column_query.get()
            except OperationalError:
                return
            if parent_name_path is None:
                if column.id_parent_persistent is None:
                    parent_name_path = []
                else:
                    parent_name_path = column_name_path_cache.get(
                        column.id_parent_persistent
                    )
            name_path = parent_name_path + [column.name]
            column_name_path_cache.set(column.id_persistent, name_path)
            children = Column.children_query_set(column.id_persistent)
            for child in children:
                if not child.disabled:
                    enqueue(update_column_name_path, child.id_persistent, name_path)

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
    enqueue(update_column_name_path, str(instance.id_persistent))


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
