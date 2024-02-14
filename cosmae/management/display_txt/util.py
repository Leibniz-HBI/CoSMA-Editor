"Utils for managing display text alternatives"

from django.db.models import Case, IntegerField, OuterRef, Subquery, When

from cosmae.management.models_django import ConfigValue
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagDefinition

DISPLAY_TXT_ORDER_CONFIG_KEY = "display_txt_order"


def get_display_txt_order_tag_definitions(id_contribution_persistent=None):
    "Retrieve the order of tag definitions used for display text alternatives."
    id_tag_def_persistent_list = ConfigValue.get(DISPLAY_TXT_ORDER_CONFIG_KEY, [])
    if id_contribution_persistent is None:
        order = [
            When(id_persistent=val, then=idx)
            for idx, val in enumerate(id_tag_def_persistent_list)
        ]
        tag_def_query = TagDefinition.query_set().filter(
            id_persistent__in=id_tag_def_persistent_list
        )

    else:
        merge_requests = TagMergeRequest.get_for_contribution_query_set(
            str(id_contribution_persistent)
        )
        relevant_for_display_txt_order = merge_requests.filter(
            id_destination_persistent__in=id_tag_def_persistent_list
        )
        tag_def_query = (
            TagDefinition.query_set()
            .annotate(
                id_destination_persistent=Subquery(
                    relevant_for_display_txt_order.filter(
                        id_origin_persistent=OuterRef("id_persistent")
                    ).values("id_destination_persistent")
                )
            )
            .filter(id_destination_persistent__isnull=False)
        )
        order = [
            When(id_destination_persistent=val, then=idx)
            for idx, val in enumerate(id_tag_def_persistent_list)
        ]
    return tag_def_query.annotate(
        sort_key=Case(*order, output_field=IntegerField())
    ).order_by("sort_key")
