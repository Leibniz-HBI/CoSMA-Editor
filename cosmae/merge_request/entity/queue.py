"Queue methods for entity merge requests"

from datetime import datetime
from logging import getLogger
from uuid import uuid4

from django.db import OperationalError, transaction
from django_rq import enqueue

from cosmae.column.models_django import Column, ColumnHistory
from cosmae.entity.models_django import Entity, EntityHistory, entity_objects
from cosmae.exception import (
    ColumnExistsException,
    EntityUpdatedException,
    PermissionException,
)
from cosmae.justification.models_django import EntityJustification
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution,
    EntityMergeRequest,
)
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.util import CosmaeUser, timestamp
from cosmae.value.models_django import (
    ValueAbstract,
    ValueHistory,
)

_LOGGER = getLogger(__name__)


class NotResolvedException(Exception):
    "Raised when resolving is tried for unresolved merge requests."


def apply_entity_merge_request(id_entity_merge_request_persistent: str):
    """Queue method for applying merge requests.
    Unresolved conflicts will result in a column merge request."""
    # pylint: disable=too-many-locals
    mr_query = EntityMergeRequest.objects.filter(  # pylint: disable=no-member
        id_persistent=id_entity_merge_request_persistent
    )
    time_edit = timestamp()
    try:
        with transaction.atomic():
            mr_query.select_for_update()
            merge_request = mr_query.get()
            if merge_request.state != EntityMergeRequest.State.RESOLVED:
                if merge_request.state == EntityMergeRequest.State.MERGED:
                    return
                raise NotResolvedException("Entity Merge request is not resolved.")
            user = CosmaeUser.by_id_persistent_query_set(
                merge_request.approved_by_session.id_owner_persistent
            ).get()
            resolutions = EntityConflictResolution.for_merge_request_query_set(
                merge_request
            )
            # get recent resolutions and apply them
            recent_resolutions = resolutions.only_recent()
            unresolved_resolutions = recent_resolutions.unresolved()
            resolved_resolutions = recent_resolutions.resolved()
            non_recent_resolutions = resolutions.non_recent()
            # get unresolved conflicts and create merge requests.
            # This has to be done first otherwise resolutions are not recent.
            # This will lead to unnecessary merge requests.
            for qs in [unresolved_resolutions, non_recent_resolutions]:
                for unresolved in qs:
                    create_column_merge_request_for_unresolved_conflict(
                        merge_request,
                        unresolved.value_origin,
                        merge_request.id_destination_persistent,
                        unresolved.column,
                        user,
                        time_edit,
                    )
            # resolve conflicts
            for resolved in resolved_resolutions:
                if resolved.replacement_state is not None:
                    apply_resolution(resolved, user, time_edit)
            # disable the destination entity
            origin = Entity.most_recent_by_id(merge_request.id_origin_persistent)
            disabled, _ = EntityHistory.change_or_create_versioned(
                display_txt=origin.display_txt,
                id_persistent=origin.id_persistent,
                # this is the write for disabling. This is written by the approver.
                written_by_session=user.edit_session,
                approved_by_id_persistent=user.id_persistent,
                version=origin.id,
                disabled=True,
                time_edit=time_edit,
            )
            disabled.save()
            EntityJustification.copy(
                merge_request.id_origin_persistent,
                merge_request.id_destination_persistent,
            )
            destination = Entity.most_recent_by_id(
                merge_request.id_destination_persistent
            )
            merged, _ = EntityHistory.change_or_create_versioned(
                id_persistent=destination.id_persistent,
                written_by_session=user.edit_session,
                approved_by_id_persistent=user.id_persistent,
                version=destination.id,
                merged_from=origin.id_persistent,
                time_edit=time_edit,
            )
            merged.save()
            merge_request.state = EntityMergeRequest.State.MERGED
            merge_request.save()

    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error(None, exc_info=exc)
        merge_request = mr_query.get()
        merge_request.state = EntityMergeRequest.State.OPEN
        merge_request.save()


def create_column_merge_request_for_unresolved_conflict(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    entity_merge_request: EntityMergeRequest,
    value_origin: ValueAbstract,
    id_entity_destination_persistent: str,
    column_existing: ColumnHistory,
    user: CosmaeUser,
    time_edit: datetime,
):
    "Create a new merge request for instances where an entity merge conflict is not resolved."
    # Create Column Merge Request for the column.
    count = 0
    # Create temporary i.e. disabled column
    while True:
        try:
            column_new, _do_write = ColumnHistory.change_or_create_versioned(
                id_persistent=uuid4(),
                name=f"from entity merge {entity_merge_request.id_persistent}_{count}",
                id_parent_persistent=column_existing.id_parent_persistent,
                type=column_existing.type,
                time_edit=time_edit,
                owner=user,
                hidden=True,
                written_by_session=user.edit_session,
                approved_by_id_persistent=user.id_persistent,
            )
            column_new.save()
            break
        except ColumnExistsException:
            count += 1
        # Create Value for that column
    value, _ = ValueHistory.change_or_create_versioned(
        id_persistent=uuid4(),
        id_column_persistent=column_new.id_persistent,
        id_entity_persistent=id_entity_destination_persistent,
        value=value_origin.value,
        time_edit=time_edit,
        written_by_session=value_origin.written_by_session,
        approved_by_id_persistent=user.id_persistent,
    )
    value.save()
    if column_existing.owner_id is None:
        assigned_to_id = None
    else:
        assigned_to_id = column_existing.owner_id
    # Create column merge request.
    ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=column_new.id_persistent,
        id_destination_persistent=column_existing.id_persistent,
        assigned_to_id=assigned_to_id,
        created_by=user,
        state=ColumnMergeRequest.State.CONFLICTS,
        created_at=time_edit,
        id_persistent=uuid4(),
        disable_origin_on_merge=True,
    )


def apply_resolution(
    resolution: EntityConflictResolution,
    user: CosmaeUser,
    time_edit: datetime,
):
    "Apply a entity merge request conflict resolution"
    if (
        resolution.replacement_state is None
        or resolution.replacement_state == EntityConflictResolution.KEEP
    ):
        return
    value = None
    if resolution.replacement_state == EntityConflictResolution.REPLACE:
        value = resolution.value_origin.value
    elif resolution.replacement_state == EntityConflictResolution.VALUE:
        value = resolution.replacement_value
    value_destination = resolution.value_destination
    if value_destination is None:
        id_destination_persistent = uuid4()
        version = None
    else:
        id_destination_persistent = value_destination.id_persistent
        version = value_destination.id
    try:
        instance, _do_write = ValueHistory.change_or_create_versioned(
            id_persistent=id_destination_persistent,
            version=version,
            id_entity_persistent=resolution.entity_destination.id_persistent,
            id_column_persistent=resolution.column.id_persistent,
            time_edit=time_edit,
            written_by_session=resolution.value_origin.written_by_session,
            approved_by_id_persistent=user.id_persistent,
            value=value,
        )
        instance.save()
    except (EntityUpdatedException, PermissionException):
        _LOGGER.exception("Could not apply entity conflict resolution", exc_info=True)
        create_column_merge_request_for_unresolved_conflict(
            resolution.merge_request,
            resolution.value_origin,
            resolution.entity_destination.id_persistent,
            resolution.column,
            user,
            time_edit,
        )


def merge_request_compute_conflicts(
    id_merge_request_persistent: str, min_idx=-2, limit=30, needs_resolution=False
):
    "Compute conflicts for an entity merge request."
    merge_request_query = (
        EntityMergeRequest.objects.filter(  # pylint: disable=no-member
            id_persistent=id_merge_request_persistent
        )
    )
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.select_for_update().get()
            except OperationalError:
                return
            if merge_request.state != EntityMergeRequest.State.CONFLICTS:
                return
            all_conflicts = merge_request.compute_instance_conflicts(min_idx)
            # only recent resolutions are relevant
            resolutions = (
                merge_request.entityconflictresolution_set.only_recent()
            )  # pylint: disable=no-member
            # need to look for unresolved conflicts
            updated_conflicts = all_conflicts.unresolved(resolutions).order_by("id")[
                :limit
            ]
            entity_origin = EntityHistory.objects.from_most_recent(
                entity_objects().by_id_persistent(merge_request.id_origin_persistent)
            ).get()
            entity_destination = EntityHistory.objects.from_most_recent(
                entity_objects().by_id_persistent(
                    merge_request.id_destination_persistent
                )
            ).get()
            max_idx = store_conflicts(
                merge_request, updated_conflicts, entity_origin, entity_destination
            )
            if max_idx >= 0:
                enqueue(
                    merge_request_compute_conflicts,
                    args=(id_merge_request_persistent, max_idx + 1, limit, True),
                    job_timeout=60,
                )
            else:
                if not needs_resolution:
                    merge_request.state = EntityMergeRequest.State.RESOLVED
                    merge_request.save(update_fields=["state"])
                else:
                    merge_request.state = EntityMergeRequest.State.OPEN
                    merge_request.save(update_fields=["state"])
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error(None, exc_info=exc)
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = EntityMergeRequest.State.ERROR
            merge_request.save()


def store_conflicts(merge_request, conflicts, entity_origin, entity_destination):
    "Store conflicts in the database."
    max_idx = -1
    for conflict in conflicts:
        column = ColumnHistory.objects.from_most_recent(
            Column.objects.filter(id_persistent=conflict.id_column_persistent)
        ).get()
        if conflict.value_destination is None:
            value_destination_id = None
            replacement_state = EntityConflictResolution.REPLACE
        else:
            value_destination_id = conflict.value_destination["id"]
            replacement_state = None
        max_idx = max(max_idx, conflict.id)
        merge_request.resolve(
            id_column_persistent=column.id_persistent,
            id_entity_origin_persistent=entity_origin.id_persistent,
            id_entity_destination_persistent=entity_destination.id_persistent,
            id_value_origin_persistent=conflict.id_persistent,
            id_column_version=column.id,
            id_entity_origin_version=entity_origin.id,
            id_entity_destination_version=entity_destination.id,
            id_value_origin_version=conflict.id,
            id_value_destination_version=value_destination_id,
            replacement_state=replacement_state,
            replacement_value=None,
        )
    return max_idx


def entity_conflicts_signal_handler(  # pylint: disable=unused-argument
    sender, instance, created, update_fields, **kwargs
):
    "Signal handler for triggering column conflict computation."
    if not (created or (update_fields and "state" in update_fields)):
        return
    if instance.state == EntityMergeRequest.State.CONFLICTS:
        enqueue(
            merge_request_compute_conflicts,
            args=(
                str(
                    instance.id_persistent,
                ),
            ),
            job_timeout=60 * 12,
        )
    elif instance.state == ColumnMergeRequest.State.RESOLVED:
        enqueue(
            apply_entity_merge_request,
            args=(str(instance.id_persistent),),
            job_timeout=60 * 12,
        )
