"Queue methods for merge requests."

import logging
from typing import Optional
from uuid import uuid4

import django_rq
from django.db import models, transaction
from django.db.utils import OperationalError

from cosmae.edit_session.models_django import EditSession
from cosmae.exception import EntityUpdatedException
from cosmae.merge_request.models_django import TagConflictResolution, TagMergeRequest
from cosmae.tag.models_django import (
    TagDefinition,
    TagDefinitionHistory,
    TagInstance,
    TagInstanceHistory,
)
from cosmae.util import CosmaeUser, timestamp


def disable_origin(
    merge_request: TagMergeRequest,
    written_by_session: EditSession,
    id_approved_by_persistent: Optional[str],
    time_edit,
):
    "If configured: disable the origin tag of a merge request."
    if merge_request.disable_origin_on_merge:
        tag_definition = TagDefinition.most_recent_by_id(
            merge_request.id_origin_persistent
        )
        disabled, _ = TagDefinitionHistory.change_or_create_versioned(
            tag_definition.id_persistent,
            time_edit,
            # This is the disabling write it was approved and written by the approver
            written_by_session=written_by_session,
            approved_by_id_persistent=id_approved_by_persistent,
            name=tag_definition.name,
            id_parent_persistent=tag_definition.id_parent_persistent,
            version=tag_definition.id,
            owner=tag_definition.owner,
            type=tag_definition.type,
            curated=tag_definition.curated,
            hidden=tag_definition.hidden,
            disabled=True,
        )
        disabled.save()


def merge_request_fast_forward(id_merge_request_persistent):
    "Tries to fast forward a merge request."
    merge_request_query = TagMergeRequest.objects.filter(  # pylint: disable=no-member
        id_persistent=id_merge_request_persistent
    )
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.get()
            except OperationalError:
                return
            tag_definition_destination = TagDefinition.most_recent_by_id(
                merge_request.id_destination_persistent
            )
            if (
                tag_definition_destination.curated
                or not tag_definition_destination.has_write_access(
                    merge_request.created_by.id_persistent
                )
            ):
                return
            tag_instances_destination = TagInstance.by_tag_chunked_queryset(
                merge_request.id_destination_persistent, 0, 1
            )
            time_merge = timestamp()
            if len(tag_instances_destination) == 0:
                tag_instance_query = (
                    TagInstance.objects.filter(  # pylint: disable=no-member
                        id_tag_definition_persistent=merge_request.id_origin_persistent
                    )
                )
                for tag_instance in tag_instance_query:
                    tag_instance, _do_write = (
                        TagInstanceHistory.change_or_create_versioned(
                            id_persistent=str(uuid4()),
                            # TODO correct written by? needs approved by? pylint: disable=fixme
                            written_by_session=merge_request.created_by.edit_session,
                            time_edit=time_merge,
                            id_entity_persistent=tag_instance.id_entity_persistent,
                            id_tag_definition_persistent=merge_request.id_destination_persistent,
                            value=tag_instance.value,
                            version=None,
                        )
                    )
                    tag_instance.save()
                merge_request.state = TagMergeRequest.MERGED
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
            merge_request.state = TagMergeRequest.ERROR
            merge_request.save()


class NotResolvedException(Exception):
    "Raised when resolving is tried for unresolved merge requests."


def merge_request_resolve_conflicts(  # pylint: disable=too-many-locals
    id_merge_request_persistent, id_approved_by_persistent
):
    "Merges a merge request while incorporating conflict resolutions."
    merge_request_query = TagMergeRequest.objects.filter(  # pylint: disable=no-member
        id_persistent=id_merge_request_persistent
    )
    approved_by_query = CosmaeUser.by_id_persistent_query_set(id_approved_by_persistent)
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.get()
                if not merge_request.state == TagMergeRequest.RESOLVED:
                    raise NotResolvedException("Tag Merge request is not resolved.")
                approved_by = approved_by_query.get()
            except OperationalError:
                return
            time_merge = timestamp()
            conflicts_resolution_set = (
                merge_request.tagconflictresolution_set.select_related()
            )
            non_recent = TagConflictResolution.non_recent(conflicts_resolution_set)
            if len(non_recent) > 0:
                merge_request.state = merge_request.OPEN
                merge_request.save()
                return
            recent = TagConflictResolution.only_recent(conflicts_resolution_set)
            conflicts = merge_request.instance_conflicts_all(False, recent)
            if len(conflicts) > 0:
                merge_request.state = merge_request.OPEN
                merge_request.save()
                return
            recent = recent.filter(
                models.Q(replace=True)
                & ~models.Q(
                    tag_instance_origin__value=models.F(
                        "tag_instance_destination__value"
                    )
                )
            )
            for resolution in recent:
                try:
                    tag_definition_destination = resolution.tag_definition_destination
                    if resolution.tag_instance_destination is None:
                        id_persistent = str(uuid4())
                        version = None
                    else:
                        tag_instance_reference = resolution.tag_instance_destination
                        id_persistent = tag_instance_reference.id_persistent
                        version = tag_instance_reference.id
                    TagInstanceHistory.change_or_create_versioned(
                        id_persistent=id_persistent,
                        time_edit=time_merge,
                        written_by_session=resolution.tag_instance_origin.written_by_session,
                        approved_by_id_persistent=approved_by.id_persistent,
                        id_entity_persistent=resolution.tag_instance_origin.id_entity_persistent,
                        id_tag_definition_persistent=tag_definition_destination.id_persistent,
                        merged_from=resolution.tag_instance_origin.id_persistent,
                        version=version,
                        value=resolution.tag_instance_origin.value,
                    )[0].save()
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
            merge_request.state = TagMergeRequest.ERROR
            merge_request.save()


def dispatch_resolve_conflicts(merge_request: TagMergeRequest, approved_by: CosmaeUser):
    "Dispatch method for resolving conflicts to queue"
    django_rq.enqueue(
        merge_request_resolve_conflicts,
        str(merge_request.id_persistent),
        str(approved_by.id_persistent),
    )
