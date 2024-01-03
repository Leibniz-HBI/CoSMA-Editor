"Queue methods for merge requests."
import logging
from uuid import uuid4

import django_rq
from django.db import models, transaction
from django.db.utils import OperationalError

from cosmae.exception import EntityUpdatedException
from cosmae.merge_request.models_django import TagConflictResolution, TagMergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance, TagInstanceHistory
from cosmae.util import timestamp


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
            if not tag_definition_destination.has_write_access(
                merge_request.created_by
            ):
                return
            tag_instances_destination = TagInstance.by_tag_chunked(
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
                    tag_instance, _do_write = TagInstanceHistory.change_or_create(
                        id_persistent=str(uuid4()),
                        id_entity_persistent=tag_instance.id_entity_persistent,
                        id_tag_definition_persistent=merge_request.id_destination_persistent,
                        value=tag_instance.value,
                        user=merge_request.created_by,
                        version=None,
                        time_edit=time_merge,
                    )
                    tag_instance.save()
                merge_request.state = TagMergeRequest.MERGED
                merge_request.save()
                return
            merge_request.state = merge_request.CONFLICTS
            merge_request.save(update_fields=["state"])
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = TagMergeRequest.ERROR
            merge_request.save()


def merge_request_resolve_conflicts(id_merge_request_persistent):
    "Merges a merge request while incorporating conflict resolutions."
    merge_request_query = TagMergeRequest.objects.filter(  # pylint: disable=no-member
        id_persistent=id_merge_request_persistent
    )
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.get()
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
                    TagInstanceHistory.change_or_create(
                        id_persistent=id_persistent,
                        time_edit=time_merge,
                        id_entity_persistent=resolution.tag_instance_origin.id_entity_persistent,
                        id_tag_definition_persistent=tag_definition_destination.id_persistent,
                        user=merge_request.assigned_to,
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
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = TagMergeRequest.ERROR
            merge_request.save()


def dispatch_merge_request_queue_process(
    sender,
    instance,
    created,
    update_fields,
    **kwargs  # pylint: disable=unused-argument
):
    "Dispatches queue methods for merge requests."
    if not (update_fields and "state" in update_fields):
        return
    if instance.state == TagMergeRequest.RESOLVED:
        django_rq.enqueue(merge_request_resolve_conflicts, str(instance.id_persistent))
