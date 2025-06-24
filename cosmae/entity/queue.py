"Methods for updating the display_txt on entity changes."

import logging

from django.core.cache import caches
from django.db.models import OuterRef, Subquery
from django_rq import enqueue

from cosmae.column.models_django import Column as ColumnDb
from cosmae.entity.models_django import Entity
from cosmae.management.display_txt.util import get_display_txt_order_columns
from cosmae.user.model_conversion.public import user_db_to_public_user_info_dict
from cosmae.value.models_django import Value

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
            column_order_query = get_display_txt_order_columns(
                entity.contribution_candidate_id
            )
            with_value_value_query = column_order_query.annotate(
                value=Subquery(
                    Value.objects.filter(  # pylint: disable=no-member
                        id_entity_persistent=id_entity_persistent,
                        id_column_persistent=OuterRef("id_persistent"),
                    ).values("value")
                )
            )
            for column in with_value_value_query:
                if column.value is not None:
                    column_dict = column_db_to_dict(column)

                    entity_display_txt_information_cache.set(
                        id_entity_persistent,
                        (
                            column.value,
                            column_dict,
                        ),
                    )
                    return
    except Exception as exc:  # pylint: disable=broad-except
        logging.error(
            "Could not compute display_txt for entity with id_persistent: %s",
            id_entity_persistent,
            exc_info=exc,
        )


_column_type_mapping_db_to_api = {
    ColumnDb.BOOL: "BOOL",
    ColumnDb.INNER: "INNER",
    ColumnDb.FLOAT: "FLOAT",
    ColumnDb.STRING: "STRING",
}


def column_db_to_dict(column):
    "Convert a column from Django ORM to dict representation."
    column_dict = {
        "id_persistent": column.id_persistent,
        "id_parent_persistent": column.id_parent_persistent,
        "name": column.name,
        "id": column.id,
        "type": column.type,
        "owner": user_db_to_public_user_info_dict(column.owner),
        "curated": column.curated,
        "description": column.description,
        "hidden": column.hidden,
        "disabled": column.disabled,
    }

    return column_dict


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
