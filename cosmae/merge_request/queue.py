"Queue methods for merge requests."

import logging
from typing import Optional
from uuid import uuid4

import django_rq
from django.db import models, transaction
from django.db.utils import OperationalError

from cosmae.column.models_django import Column, ColumnHistory
from cosmae.edit_session.models_django import EditSession
from cosmae.exception import EntityUpdatedException
from cosmae.merge_request.models_django import (
    ColumnConflictResolution,
    ColumnMergeRequest,
)
from cosmae.util import CosmaeUser, timestamp
from cosmae.value.models_django import (
    Value,
    ValueHistory,
    value_objects,
)


def disable_origin(
    merge_request: ColumnMergeRequest,
    written_by_session: EditSession,
    id_approved_by_persistent: Optional[str],
    time_edit,
):
    "If configured: disable the origin column of a merge request."
    if merge_request.disable_origin_on_merge:
        column = Column.most_recent_by_id(merge_request.id_origin_persistent)
        disabled, _ = ColumnHistory.change_or_create_versioned(
            column.id_persistent,
            time_edit,
            # This is the disabling write it was approved and written by the approver
            written_by_session=written_by_session,
            approved_by_id_persistent=id_approved_by_persistent,
            name=column.name,
            id_parent_persistent=column.id_parent_persistent,
            version=column.id,
            owner=column.owner,
            type=column.type,
            curated=column.curated,
            hidden=column.hidden,
            disabled=True,
        )
        disabled.save()


def merge_request_fast_forward(id_merge_request_persistent):
    "Tries to fast forward a merge request."
    merge_request_query = (
        ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=id_merge_request_persistent
        )
    )
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.get()
            except OperationalError:
                return
            column_destination = Column.most_recent_by_id(
                merge_request.id_destination_persistent
            )
            if column_destination.curated or not column_destination.has_write_access(
                merge_request.created_by.id_persistent
            ):
                return
            values_destination = value_objects().by_column_chunked_queryset(
                merge_request.id_destination_persistent, 0, 1
            )
            time_merge = timestamp()
            if len(values_destination) == 0:
                value_query = Value.objects.filter(  # pylint: disable=no-member
                    id_column_persistent=merge_request.id_origin_persistent
                )
                for value in value_query:
                    value, _do_write = ValueHistory.change_or_create_versioned(
                        id_persistent=str(uuid4()),
                        written_by_session=merge_request.created_by.edit_session,
                        time_edit=time_merge,
                        id_entity_persistent=value.id_entity_persistent,
                        id_column_persistent=merge_request.id_destination_persistent,
                        value=value.value,
                        version=None,
                    )
                    value.save()
                merge_request.state = ColumnMergeRequest.MERGED
                merge_request.save()
                disable_origin(
                    merge_request,
                    merge_request.created_by.edit_session,
                    None,
                    time_merge,
                )
                return
            merge_request.state = merge_request.CONFLICTS
            merge_request.save(update_fields=["state"])
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = ColumnMergeRequest.ERROR
            merge_request.save()


class NotResolvedException(Exception):
    "Raised when resolving is tried for unresolved merge requests."


def merge_request_resolve_conflicts(  # pylint: disable=too-many-locals
    id_merge_request_persistent, id_approved_by_persistent
):
    "Merges a merge request while incorporating conflict resolutions."
    merge_request_query = (
        ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=id_merge_request_persistent
        )
    )
    approved_by_query = CosmaeUser.by_id_persistent_query_set(id_approved_by_persistent)
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.get()
                if not merge_request.state == ColumnMergeRequest.RESOLVED:
                    if merge_request.state == ColumnMergeRequest.MERGED:
                        return
                    raise NotResolvedException("Column Merge request is not resolved.")
                approved_by = approved_by_query.get()
            except OperationalError:
                return
            time_merge = timestamp()
            conflicts_resolution_set = (
                merge_request.columnconflictresolution_set.select_related()
            )
            non_recent = ColumnConflictResolution.non_recent(conflicts_resolution_set)
            if len(non_recent) > 0:
                merge_request.state = merge_request.OPEN
                merge_request.save()
                return
            recent = ColumnConflictResolution.only_recent(conflicts_resolution_set)
            conflicts = merge_request.instance_conflicts_all(False, recent)
            if len(conflicts) > 0:
                merge_request.state = merge_request.OPEN
                merge_request.save()
                return
            try:
                with transaction.atomic():
                    perform_instance_replacement(recent, approved_by, time_merge)
                    perform_value_replacement(recent, approved_by, time_merge)
            except EntityUpdatedException as exc:
                logging.warning(None, exc_info=exc)
                merge_request.state = merge_request.OPEN
                merge_request.save()
                return

            merge_request.state = merge_request.MERGED
            merge_request.save()
            disable_origin(
                merge_request,
                merge_request.created_by.edit_session,
                approved_by.id_persistent,
                time_merge,
            )
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = ColumnMergeRequest.ERROR
            merge_request.save()


def perform_instance_replacement(recent_queryset, approved_by, time_merge):
    "Perform replacement where the instance from the origin column is selected."
    replace_queryset = recent_queryset.filter(
        models.Q(replacement_state=ColumnConflictResolution.REPLACE)
        & ~models.Q(value_origin__value=models.F("value_destination__value"))
    )
    for resolution in replace_queryset:
        column_destination = resolution.column_destination
        if resolution.value_destination is None:
            id_persistent = str(uuid4())
            version = None
        else:
            value_reference = resolution.value_destination
            id_persistent = value_reference.id_persistent
            version = value_reference.id
        ValueHistory.change_or_create_versioned(
            id_persistent=id_persistent,
            time_edit=time_merge,
            written_by_session=resolution.value_origin.written_by_session,
            approved_by_id_persistent=approved_by.id_persistent,
            id_entity_persistent=resolution.value_origin.id_entity_persistent,
            id_column_persistent=column_destination.id_persistent,
            merged_from=resolution.value_origin.id_persistent,
            version=version,
            value=resolution.value_origin.value,
        )[0].save()


def perform_value_replacement(recent_queryset, approved_by, time_merge):
    "Perform the replacement for resolutions where a replacement value is provided."
    replace_queryset = recent_queryset.filter(
        models.Q(replacement_state=ColumnConflictResolution.VALUE)
        & ~models.Q(replacement_value=models.F("value_destination__value"))
    )
    for resolution in replace_queryset:
        column_destination = resolution.column_destination
        if resolution.value_destination is None:
            id_persistent = str(uuid4())
            version = None
        else:
            value_reference = resolution.value_destination
            id_persistent = value_reference.id_persistent
            version = value_reference.id
        ValueHistory.change_or_create_versioned(
            id_persistent=id_persistent,
            time_edit=time_merge,
            written_by_session=resolution.value_origin.written_by_session,
            approved_by_id_persistent=approved_by.id_persistent,
            id_entity_persistent=resolution.value_origin.id_entity_persistent,
            id_column_persistent=column_destination.id_persistent,
            merged_from=resolution.value_origin.id_persistent,
            version=version,
            value=resolution.replacement_value,
        )[0].save()


def dispatch_resolve_conflicts(
    merge_request: ColumnMergeRequest, approved_by: CosmaeUser
):
    "Dispatch method for resolving conflicts to queue"
    django_rq.enqueue(
        merge_request_resolve_conflicts,
        str(merge_request.id_persistent),
        str(approved_by.id_persistent),
    )
