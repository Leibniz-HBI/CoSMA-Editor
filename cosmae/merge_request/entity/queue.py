"Queue methods for entity merge requests"
import logging
from datetime import datetime
from typing import Dict
from uuid import uuid4

from django.db import models, transaction

from cosmae.entity.models_django import Entity
from cosmae.exception import (
    EntityUpdatedException,
    TagDefinitionExistsException,
    TagDefinitionPermissionException,
)
from cosmae.merge_request.entity.models_django import (
    EntityConflictResolution,
    EntityMergeRequest,
)
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import (
    TagDefinition,
    TagDefinitionHistory,
    TagInstanceAbstract,
    TagInstanceHistory,
)
from cosmae.util import CosmaeUser, timestamp


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
                return
            user = user_query.get()
            resolutions = EntityConflictResolution.for_merge_request_query_set(
                merge_request
            )
            # get recent resolutions and apply them
            recent_resolutions = EntityConflictResolution.only_recent(resolutions)
            for resolved in recent_resolutions:
                if resolved.replace:
                    apply_resolution(resolved, user, time_edit)
            # get unresolved conflicts and create merge requests.
            unresolved_conflict_query_set = merge_request.instance_conflicts_all(
                include_resolved=False, resolution_values=recent_resolutions
            ).annotate(
                tag_definition_dict=models.Subquery(
                    TagDefinition.query_set()
                    .filter(
                        id_persistent=models.OuterRef("id_tag_definition_persistent")
                    )[:1]
                    .values(
                        json=models.functions.JSONObject(
                            type="type",
                            owner_id="owner__id",
                            id_persistent="id_persistent",
                        )
                    )
                )
            )
            for unresolved in unresolved_conflict_query_set:
                create_tag_definition_merge_request_for_unresolved_conflict(
                    merge_request,
                    unresolved,
                    merge_request.id_destination_persistent,
                    unresolved.tag_definition_dict,
                    user,
                    time_edit,
                )
            # disable the destination entity
            origin = Entity.most_recent_by_id(merge_request.id_origin_persistent)
            disabled, _ = Entity.change_or_create(
                display_txt=origin.display_txt,
                id_persistent=origin.id_persistent,
                version=origin.id,
                disabled=True,
                time_edit=time_edit,
            )
            disabled.save()
            merge_request.state = EntityMergeRequest.MERGED
            merge_request.save()

    except Exception as exc:  # pylint: disable=broad-except
        logging.error(None, exc_info=exc)


def create_tag_definition_merge_request_for_unresolved_conflict(  # pylint: disable=too-many-arguments
    entity_merge_request: EntityMergeRequest,
    tag_instance_origin: TagInstanceAbstract,
    id_entity_destination_persistent: str,
    tag_definition_existing_dict: Dict[str, object],
    user: CosmaeUser,
    time_edit: datetime,
):
    "Create a new merge request for instances where an entity merge conflict is not resolved."
    # Create TagDefinition Merge Request for the tag definition.
    count = 0
    # Create temporary i.e. disabled tag definition
    while True:
        try:
            tag_definition_new, _do_write = TagDefinitionHistory.change_or_create(
                id_persistent=uuid4(),
                name=f"from entity merge {entity_merge_request.id_persistent}_{count}",
                id_parent_persistent=tag_definition_existing_dict["id_persistent"],
                type=tag_definition_existing_dict["type"],
                time_edit=time_edit,
                owner=user,
                hidden=True,
            )
            tag_definition_new.save()
            break
        except TagDefinitionExistsException:
            count += 1
        # Create Tag Instance for that tag definition
    tag_instance, _ = TagInstanceHistory.change_or_create(
        id_persistent=uuid4(),
        id_tag_definition_persistent=tag_definition_new.id_persistent,
        id_entity_persistent=id_entity_destination_persistent,
        value=tag_instance_origin.value,
        time_edit=time_edit,
        user=user,
    )
    tag_instance.save()
    # Create tag definition merge request.
    TagMergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=tag_definition_new.id_persistent,
        id_destination_persistent=tag_definition_existing_dict["id_persistent"],
        assigned_to_id=tag_definition_existing_dict["owner_id"],
        created_by=user,
        state=TagMergeRequest.OPEN,
        created_at=time_edit,
        id_persistent=uuid4(),
    )


def apply_resolution(
    resolution: EntityConflictResolution,
    user: CosmaeUser,
    time_edit: datetime,
):
    "Apply a entity merge request conflict resolution"
    if not resolution.replace:
        return
    try:
        instance, _do_write = TagInstanceHistory.change_or_create(
            id_persistent=resolution.tag_instance_destination.id_persistent,
            version=resolution.tag_instance_destination_id,
            id_entity_persistent=resolution.entity_destination.id_persistent,
            id_tag_definition_persistent=resolution.tag_definition.id_persistent,
            time_edit=time_edit,
            user=user,
            value=resolution.tag_instance_origin.value,
        )
        instance.save()
    except (EntityUpdatedException, TagDefinitionPermissionException):
        create_tag_definition_merge_request_for_unresolved_conflict(
            resolution.merge_request,
            resolution.tag_instance_origin,
            resolution.entity_destination.id_persistent,
            resolution.tag_definition.__dict__,
            user,
            time_edit,
        )
