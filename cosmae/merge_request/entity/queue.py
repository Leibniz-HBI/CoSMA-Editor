"Queue methods for entity merge requests"

import logging
from datetime import datetime
from typing import Dict
from uuid import uuid4

from django.db import models, transaction

from cosmae.column.models_django import Column, ColumnHistory
from cosmae.entity.models_django import Entity, EntityHistory
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


class NotResolvedException(Exception):
    "Raised when resolving is tried for unresolved merge requests."


def apply_entity_merge_request(
    id_entity_merge_request_persistent: str, id_user_persistent
):
    """Queue method for applying merge requests.
    Unresolved conflicts will result in a merge request."""
    # pylint: disable=too-many-locals
    mr_query = EntityMergeRequest.objects.filter(  # pylint: disable=no-member
        id_persistent=id_entity_merge_request_persistent
    )
    user_query = CosmaeUser.by_id_persistent_query_set(id_user_persistent)
    time_edit = timestamp()
    try:
        with transaction.atomic():
            mr_query.select_for_update()
            merge_request = mr_query.get()
            if merge_request.state != EntityMergeRequest.RESOLVED:
                if merge_request.state == EntityMergeRequest.MERGED:
                    return
                raise NotResolvedException("Entity Merge request is not resolved.")
            user = user_query.get()
            resolutions = EntityConflictResolution.for_merge_request_query_set(
                merge_request
            )
            # get recent resolutions and apply them
            recent_resolutions = resolutions.only_recent()
            # get unresolved conflicts and create merge requests.
            # This has to be done first otherwise resolutions are not recent.
            # This will lead to unnecesary merge requests.
            unresolved_conflict_query_set = merge_request.instance_conflicts_all(
                include_resolved=False, resolution_values=recent_resolutions
            ).annotate(
                column_dict=models.Subquery(
                    Column.query_set()
                    .filter(id_persistent=models.OuterRef("id_column_persistent"))[:1]
                    .values(
                        json=models.functions.JSONObject(
                            type="type",
                            owner_id="owner__id",
                            id_persistent="id_persistent",
                            id_parent_persistent="id_parent_persistent",
                        )
                    )
                )
            )
            for unresolved in unresolved_conflict_query_set:
                create_column_merge_request_for_unresolved_conflict(
                    merge_request,
                    unresolved,
                    merge_request.id_destination_persistent,
                    unresolved.column_dict,
                    user,
                    time_edit,
                )
            # resolve conflicts
            for resolved in recent_resolutions:
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
            merge_request.state = EntityMergeRequest.MERGED
            merge_request.save()

    except Exception as exc:  # pylint: disable=broad-except
        logging.error(None, exc_info=exc)
        merge_request = mr_query.get()
        merge_request.state = EntityMergeRequest.OPEN
        merge_request.save()


def create_column_merge_request_for_unresolved_conflict(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    entity_merge_request: EntityMergeRequest,
    value_origin: ValueAbstract,
    id_entity_destination_persistent: str,
    column_existing_dict: Dict[str, object],
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
                id_parent_persistent=column_existing_dict["id_parent_persistent"],
                type=column_existing_dict["type"],
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
    # Create column merge request.
    ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=column_new.id_persistent,
        id_destination_persistent=column_existing_dict["id_persistent"],
        assigned_to_id=column_existing_dict["owner_id"],
        created_by=user,
        state=ColumnMergeRequest.OPEN,
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
        create_column_merge_request_for_unresolved_conflict(
            resolution.merge_request,
            resolution.value_origin,
            resolution.entity_destination.id_persistent,
            resolution.column.__dict__,
            user,
            time_edit,
        )
