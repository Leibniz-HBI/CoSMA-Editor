"Utils for managing display text alternatives"
from django.db.models import Case, IntegerField, When

from cosmae.management.models_django import ConfigValue
from cosmae.tag.models_django import TagDefinition

DISPLAY_TXT_ORDER_CONFIG_KEY = "display_txt_order"


def get_display_txt_order_tag_definitions():
    "Retrieve the order of tag definitions used for display text alternatives."
    id_tag_def_persistent_list = ConfigValue.get(DISPLAY_TXT_ORDER_CONFIG_KEY, [])
    order = [
        When(id_persistent=val, then=idx)
        for idx, val in enumerate(id_tag_def_persistent_list)
    ]
    tag_def_query = (
        TagDefinition.most_recent_query_set()
        .filter(id_persistent__in=id_tag_def_persistent_list)
        .annotate(sort_key=Case(*order, output_field=IntegerField()))
        .order_by("sort_key")
    )

    return tag_def_query
