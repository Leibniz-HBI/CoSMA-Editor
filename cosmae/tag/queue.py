"""Queue methods for tag instances and tag definitions."""
from typing import List, Optional

from django.core.cache import caches
from django.db import transaction
from django.db.utils import OperationalError
from django_rq import enqueue

from cosmae.tag.models_django import TagDefinition

tag_definition_name_path_cache = caches["tag_definition_name_paths"]


def get_tag_definition_name_path(tag_definition: TagDefinition):
    """Get the name path of a tag definition.
    This will retrieve the name path from the cache if present.
    Otherwise only the name is returned and an update to the cache is triggered."""
    name_path = tag_definition_name_path_cache.get(tag_definition.id_persistent)
    if name_path is None:
        name_path = [tag_definition.name]
        enqueue(update_tag_definition_name_path, tag_definition.id_persistent)
    return name_path


def update_tag_definition_name_path(
    id_tag_definition_persistent, parent_name_path: Optional[List[str]] = None
):
    """Update the name path cache entry for the tag definition references by its persistent id.
    If the name path of the parent is already known it can be provided as an optional parameter."""
    tag_definition_query = TagDefinition.most_recent_by_id_query_set(
        id_tag_definition_persistent
    )
    try:
        with transaction.atomic():
            try:
                tag_definition = tag_definition_query.get()
            except OperationalError:
                return
            if parent_name_path is None:
                if tag_definition.id_parent_persistent is None:
                    parent_name_path = []
                else:
                    parent_name_path = tag_definition_name_path_cache.get(
                        tag_definition.id_parent_persistent
                    )
            name_path = parent_name_path + [tag_definition.name]
            tag_definition_name_path_cache.set(tag_definition.id_persistent, name_path)
            children = TagDefinition.most_recent_children(tag_definition.id_persistent)
            for child in children:
                enqueue(update_tag_definition_name_path, child.id_persistent, name_path)

    except Exception:  # pylint: disable=broad-except
        return


def dispatch_tag_definition_queue_process(
    sender,
    instance,
    created,
    update_fields,
    **kwargs  # pylint: disable=unused-argument
):
    "Dispatches queue methods for tag definitions on save."
    if not (created or (update_fields and "id_persistent" in update_fields)):
        return
    enqueue(update_tag_definition_name_path, str(instance.id_persistent))
