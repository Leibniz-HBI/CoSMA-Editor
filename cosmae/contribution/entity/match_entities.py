"Queue method for finding duplicates in entity names for contribution candidate."
from django.contrib.postgres.search import TrigramSimilarity
from django.db import models
from Levenshtein import distance

from cosmae.entity.models_django import Entity


def find_matches(entity: Entity):
    """Finds entities without a contribution candidate
    having similar display txt, according to trigram similarity"""

    values = (
        Entity.most_recent(
            Entity.objects.filter(  # pylint: disable=no-member
                contribution_candidate=None
            )
        )
        .annotate(
            trigram_similarity=TrigramSimilarity("display_txt", entity.display_txt)
        )
        .filter(trigram_similarity__gt=0.3)
        .order_by(models.F("trigram_similarity").desc())[:10]
        .values()
    )
    ret = []
    for matched_entity in values:
        levenshtein_distance = distance(
            entity.display_txt, matched_entity["display_txt"]
        )
        levenshtein_similarity = 1 - (
            levenshtein_distance
            / max(len(entity.display_txt), len(matched_entity["display_txt"]))
        )
        if levenshtein_similarity < 0.75:
            continue
        matched_entity["levenshtein_similarity"] = levenshtein_similarity
        ret.append(matched_entity)
    return ret
