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
    "Retrieve display_txt info from the cache, if not present"
    if display_txt is not None:
        return display_txt, "Display Text"
    display_txt_info = entity_display_txt_information_cache.get(id_entity_persistent)
    if display_txt_info is None:
        enqueue(update_display_txt_cache, id_entity_persistent)
        return id_entity_persistent, "id_persistent"
    if display_txt_info[1] == "Display Text" or (
        display_txt_info[1] == "id_persistent" and display_txt is not None
    ):
        return display_txt, "Display Text"
    return display_txt_info


def update_display_txt_cache(id_entity_persistent):
    "Set the display txt for an entity in the cache."
    try:
        entity = Entity.most_recent_by_id(id_entity_persistent)
        if entity.display_txt is not None and entity.display_txt != "":
            entity_display_txt_information_cache.set(
                id_entity_persistent, (entity.display_txt, "Display Text")
            )
        else:
            tag_definition_order_query = get_display_txt_order_tag_definitions(
                entity.contribution_candidate_id
            )
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
                    tag_def_dict = tag_def_db_to_dict(tag_definition)

                    entity_display_txt_information_cache.set(
                        id_entity_persistent,
                        (
                            tag_definition.tag_instance_value,
                            tag_def_dict,
                        ),
                    )
                    return
    except Exception as exc:  # pylint: disable=broad-except
        logging.error(
            "Could not compute display_txt for entity with id_persistent: %s",
            id_entity_persistent,
            exc_info=exc,
        )


def tag_def_db_to_dict(tag_definition):
    "Convert a tag definition from Django ORM to dict representation."
    if tag_definition.owner is not None:
        username = tag_definition.owner.username
    else:
        username = None
    tag_def_dict = {
        "id_persistent": tag_definition.id_persistent,
        "id_parent_persistent": tag_definition.id_parent_persistent,
        "name": tag_definition.name,
        "id": tag_definition.id,
        "type": tag_definition.type,
        "owner": {"username": username},
        "curated": tag_definition.curated,
        "hidden": tag_definition.hidden,
        "disabled": tag_definition.disabled,
    }

    return tag_def_dict


def dispatch_display_txt_queue_process(
    sender,
    instance,
    created,
    update_fields,
    **kwargs,  # pylint: disable=unused-argument
):
    "Dispatch method for updating entity display txt, when entity has changed."
    if instance.display_txt is None:
        enqueue(update_display_txt_cache, str(instance.id_persistent))
