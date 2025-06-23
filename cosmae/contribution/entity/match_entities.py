"Queue method for finding duplicates in entity names for contribution candidate."

from cosmae.contribution.entity.match_queries import (
    MATCHES_QUERY_STRING_CONTRIBUTION,
    MATCHES_QUERY_STRING_PAIR,
)
from cosmae.entity.models_django import Entity

_DISPLAY_TXT_SIMILARITY_WEIGHT = 0.6
_MATCH_COUNT_WEIGHT = 0.4
_DISPLAY_TXT_SIMILARITY_THRESHOLD = 0.7


def find_matches(id_contribution_persistent, id_entity_persistent_list):
    """Find matches for the entities selected in the argument query set."""
    return Entity.objects.raw(  # pylint: disable=no-member
        MATCHES_QUERY_STRING_CONTRIBUTION,
        {
            "id_entity_persistent_list": id_entity_persistent_list,
            "id_contribution_persistent": str(id_contribution_persistent),
            "display_txt_similarity_weight": _DISPLAY_TXT_SIMILARITY_WEIGHT,
            "match_count_weight": _MATCH_COUNT_WEIGHT,
            "display_txt_similarity_threshold": _DISPLAY_TXT_SIMILARITY_THRESHOLD,
        },
    )


def single_pair_similarity(
    id_contribution_persistent,
    id_entity_contribution_persistent,
    id_entity_existing_persistent,
):
    "Compute similarity values for a single entity pair."
    return Entity.objects.raw(  # pylint: disable=no-member
        MATCHES_QUERY_STRING_PAIR,
        {
            "id_entity_existing_persistent": id_entity_existing_persistent,
            "id_entity_contribution_persistent": id_entity_contribution_persistent,
            "id_contribution_persistent": str(id_contribution_persistent),
            "display_txt_similarity_weight": _DISPLAY_TXT_SIMILARITY_WEIGHT,
            "match_count_weight": _MATCH_COUNT_WEIGHT,
            "display_txt_similarity_threshold": -1.0,
        },
    )
