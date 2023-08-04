"Queue methods for merge requests."
import django_rq
from django.db import transaction
from django.db.utils import OperationalError

from cosmae.exception import EntityUpdatedException
from cosmae.merge_request.models_django import ConflictResolution, MergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance
from cosmae.util import timestamp


def merge_request_fast_forward(id_merge_request_persistent):
    "Tries to fast forward a merge request."
    merge_request_query = MergeRequest.objects.filter(  # pylint: disable=no-member
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
                    tag_instance, _do_write = TagInstance.change_or_create(
                        id_persistent=tag_instance.id_persistent,
                        id_entity_persistent=tag_instance.id_entity_persistent,
                        id_tag_definition_persistent=merge_request.id_destination_persistent,
                        value=tag_instance.value,
                        version=tag_instance.id,
                        time_edit=time_merge,
                    )
                    tag_instance.save()
                merge_request.state = MergeRequest.MERGED
                merge_request.save()
                return
            merge_request.state = merge_request.CONFLICTS
            merge_request.save(update_fields=["state"])
    except Exception:  # pylint: disable=broad-except
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = MergeRequest.ERROR
            merge_request.save()


def merge_request_resolve_conflicts(id_merge_request_persistent):
    "Merges a merge request while incorporating conflict resolutions."
    merge_request_query = MergeRequest.objects.filter(  # pylint: disable=no-member
        id_persistent=id_merge_request_persistent
    )
    try:
        with transaction.atomic():
            try:
                merge_request = merge_request_query.get()
            except OperationalError:
                return
            time_merge = timestamp()
            conflicts_resolution_set = merge_request.conflictresolution_set.filter(
                replace=True
            ).select_related()
            non_recent = ConflictResolution.non_recent(conflicts_resolution_set)
            if len(non_recent) > 0:
                merge_request.state = merge_request.OPEN
                merge_request.save()
                return
            for resolution in conflicts_resolution_set:
                try:
                    tag_definition_destination = resolution.tag_definition.destination
                    TagInstance.change_or_create(
                        id_persistent=resolution.tag_instance_origin.id_persistent,
                        time_edit=time_merge,
                        id_entity_persistent=resolution.tag_instance_origin.id_entity_persistent,
                        id_tag_definition_persistent=tag_definition_destination.id_persistent,
                        version=resolution.tag_instance_origin.version,
                    )[0].save()
                except EntityUpdatedException:
                    merge_request.state = merge_request.OPEN
                    merge_request.save()
                    return

            merge_request.state = merge_request.MERGED
            merge_request.save()
    except Exception:  # pylint: disable=broad-except
        with transaction.atomic():
            merge_request = merge_request_query.get()
            merge_request.state = MergeRequest.ERROR
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
    if instance.state == MergeRequest.RESOLVED:
        django_rq.enqueue(merge_request_resolve_conflicts, str(instance.id_persistent))
