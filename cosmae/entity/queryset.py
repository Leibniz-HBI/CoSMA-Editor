"""Custom queryset for entities."""

from datetime import datetime

from django.db import models

from cosmae.justification.models_django import EntityJustification
from cosmae.versioned.models_django import (
    VersionedHistoryQuerysetMixin,
    VersionedQueryset,
)


class EntityQueryset(VersionedQueryset):
    "Custom queryset for recent entities"

    def search(self, search_term: str):
        "search for entities by display text."
        query = models.Q()
        for term in search_term.split():
            query = query & models.Q(display_txt__icontains=term)
        return self.filter(query)

    def chunk(self, offset: int, limit=int):
        "Get a portion of entities"
        return self.filter(id__gte=offset).order_by("id")[:limit]

    def exclude_contributed(self):
        "Exclude entities from queryset that belong to a contribution."
        return self.filter(contribution_candidate__isnull=True)

    def annotate_justification(
        self,
        up_until_time: datetime | None = None,
    ):
        "Annotate the most recent justification for being in the db to a query set of entities."
        inner_query = models.Q(id_entity_persistent=models.OuterRef("id_persistent"))
        if up_until_time is not None:
            inner_query &= models.Q(timestamp__lte=up_until_time)
        return self.annotate(
            justification_txt=models.Subquery(
                EntityJustification.objects.filter(  # pylint: disable=no-member
                    inner_query
                )
                .order_by(models.F("timestamp").desc())[:1]
                .values("text")
            )
        )

    def filter_by_values(self, value_objects, values_q):
        """Filter entities by values matching the provided query.
        The provided values objects is needed to ensure that the up_until_time is
        correctly applied."""
        return self.annotate(
            value_id=models.Subquery(
                value_objects.filter(
                    id_entity_persistent=models.OuterRef("id_persistent")
                )
                .filter(values_q)
                .values("id")[:1]
            )
        ).filter(value_id__isnull=False)


class EntityHistoryQueryset(EntityQueryset, VersionedHistoryQuerysetMixin):
    "Custom queryset for entity history"
