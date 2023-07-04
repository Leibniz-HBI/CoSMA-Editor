"Queue method for finding duplicates in entity names for contribution candidate."
from django.contrib.postgres.search import TrigramSimilarity

from cosmae.entity.models_django import Entity


def find_matches(entity: Entity):
    """Finds entities without a contribution candidate
    having similar display txt, according to trigram similarity"""

    return (
        Entity.most_recent(
            Entity.objects.filter(  # pylint: disable=no-member
                contribution_candidate=None
            )
        )
        .annotate(similarity=TrigramSimilarity("display_txt", entity.display_txt))
        .filter(similarity__gt=0.85)
        .order_by("-similarity")[:10]
        .values()
    )
