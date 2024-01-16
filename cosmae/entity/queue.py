"Methods for updating the display_txt on entity changes."
import logging

from django.core.cache import caches
from django.db.models import OuterRef, Subquery
from django_rq import enqueue

from cosmae.entity.models_django import Entity
from cosmae.management.display_txt.util import get_display_txt_order_tag_definitions
from cosmae.tag.models_django import TagInstance

entity_display_txt_information_cache = caches["entity_display_txt_information"]


def get_display_txt_info(id_entity_persistent, display_txt):
    "Retrieve display_txt info from the cache."
    display_txt_info = entity_display_txt_information_cache.get(id_entity_persistent)
    if (
        display_txt_info is None
        or display_txt_info[1] == "display_txt"
        or (display_txt_info[1] == "id_persistent" and display_txt is not None)
    ):
        return display_txt, "display_txt"
    return display_txt_info


def update_display_txt_cache(id_entity_persistent):
    "Set the display txt for an entity in the cache."
    try:
        entity = Entity.most_recent_by_id(id_entity_persistent)
        if entity.display_txt is not None and entity.display_txt != "":
            entity_display_txt_information_cache.set(
                id_entity_persistent, (entity.display_txt, "display_txt")
            )
        else:
            tag_definition_order_query = get_display_txt_order_tag_definitions()
            with_tag_instance_value_query = tag_definition_order_query.annotate(
                tag_instance_value=Subquery(
                    TagInstance.objects.filter(  # pylint: disable=no-member
                        id_entity_persistent=id_entity_persistent,
                        id_tag_definition_persistent=OuterRef("id_persistent"),
                    ).values("value")
                )
            )
            for tag_definition in with_tag_instance_value_query:
                if tag_definition.tag_instance_value is not None:
                    if tag_definition.owner is not None:
                        username = tag_definition.owner.username
                    else:
                        username = None
                    entity_display_txt_information_cache.set(
                        id_entity_persistent,
                        (
                            tag_definition.tag_instance_value,
                            {
                                "id_persistent": tag_definition.id_persistent,
                                "id_parent_persistent": tag_definition.id_parent_persistent,
                                "name": tag_definition.name,
                                "id": tag_definition.id,
                                "type": tag_definition.type,
                                "owner": {"username": username},
                                "curated": tag_definition.curated,
                                "hidden": tag_definition.hidden,
                            },
                        ),
                    )
                    return
            entity_display_txt_information_cache.set(
                id_entity_persistent, (id_entity_persistent, "id_persistent")
            )
    except Exception as exc:  # pylint: disable=broad-except
        logging.error(
            "Could not compute display_txt for entity with id_persistent: %s",
            id_entity_persistent,
            exc_info=exc,
        )
        entity_display_txt_information_cache.set(
            id_entity_persistent, (id_entity_persistent, "id_persistent")
        )


def dispatch_display_txt_queue_process(
    sender,
    instance,
    created,
    update_fields,
    **kwargs,  # pylint: disable=unused-argument
):
    "Dispatch method for updating entity display txt, when entity has changed."
    if created or (update_fields and "display_txt" in update_fields):
        enqueue(update_display_txt_cache, str(instance.id_persistent))
