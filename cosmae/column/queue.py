"""Queue methods for columns and values"""

import logging
from datetime import datetime
from typing import List, Optional

from django.db import transaction
from django.db.utils import OperationalError
from django_rq import enqueue

from cosmae.column.models_django import Column, ColumnHistory, ColumnNamePathCache
from cosmae.entity.queue import update_display_txt_cache

logger = logging.getLogger(__name__)


def get_column_name_path(column: Column, up_until_time: datetime | None):
    """Get the name path of a column.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    return get_column_name_path_from_parts(column.id, column.name, up_until_time)


def get_column_name_path_from_parts(
    id_column: int, name: str, up_until_time: datetime | None
):
    """Get the name path of a column using its id_persistent and name.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    try:
        cache_objects = ColumnNamePathCache.objects.filter(column_id=id_column)
        if up_until_time is not None:
            cache_objects = cache_objects.filter(time_edit__lte=up_until_time)
        name_path = (
            cache_objects.order_by("-time_edit")[:1]
            .values_list("name_path", flat=True)
            .get()
        )
    except ColumnNamePathCache.DoesNotExist as exc:
        logger.debug(
            "Column name path cache miss for column id %s at time %s",
            id_column,
            up_until_time,
            exc_info=exc,
        )
        name_path = [name]
        enqueue(update_column_name_path, id_column)
    return name_path


def update_column_name_path(
    id_column,
    parent_name_path: Optional[List[str]] = None,
    up_until_time: Optional[datetime] = None,
):
    """Update the name path cache entry for the column referenced by its version id.
    If the name path of the parent is already known it can be provided as an optional parameter.
    """
    column_query = ColumnHistory.objects.by_id_version(id_column)
    try:
        with transaction.atomic():
            try:
                column = column_query.get()
            except OperationalError:
                return
            if parent_name_path is not None:
                # if a parent path is provided, a up_until_time_must be present
                history_up_until_column = ColumnHistory.objects.up_until(
                    up_until_time
                ).most_recent()
            else:
                history_up_until_column = ColumnHistory.objects.up_until(
                    column.time_edit
                ).most_recent()
                up_until_time = column.time_edit
                if column.id_parent_persistent is None:
                    parent_name_path = []
                else:
                    try:
                        column_parent = history_up_until_column.by_id_persistent(
                            column.id_parent_persistent
                        ).get()

                        parent_name_path = (
                            ColumnNamePathCache.objects.filter(column=column_parent)
                            .values_list("name_path", flat=True)
                            .get()
                        )
                    except ColumnNamePathCache.DoesNotExist:
                        # Parent was not processed yet
                        # On parent change this method will be called
                        # with parent name path.
                        logger.error(
                            "Parent not found for column with id_version %s", column.id
                        )
                        enqueue(
                            update_column_name_path,
                            column_parent.id,
                            None,
                            up_until_time,
                        )
                        return
            name_path = parent_name_path + [column.name]
            ColumnNamePathCache.set_cache_entry(column.id, name_path, up_until_time)
            # Can only process children that exist before the column's time_edit,
            # as children relation is set up by id_persistent
            # this is mostly relevant when changing parents.
            # if a child changes later on it is responsible for its own updates
            # and that of its children.
            children = history_up_until_column.children(column.id_persistent)
            for child in children:
                if not child.disabled:
                    enqueue(update_column_name_path, child.id, name_path, up_until_time)
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Error updating column name path cache", exc_info=exc)
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
