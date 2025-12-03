"""Models for entities."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from django.contrib.postgres.indexes import GistIndex
from django.db import models
from django.db.models.aggregates import Max

from cosmae.util import CosmaeUser
from cosmae.versioned.models_django import HistoryMixin, Versioned, VersionedQueryset


class EntityAbstract(Versioned):
    """Abstract Model for a general entity"""

    display_txt = models.TextField(blank=True, null=True)
    contribution_candidate = models.ForeignKey(
        "ContributionCandidate", blank=True, null=True, on_delete=models.CASCADE
    )
    merged_from = models.CharField(max_length=36, null=True)

    unmodifiable_fields = {"id_persistent"}

    class Meta:
        "Meta class for abstract entity django model"

        abstract = True


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
                EntityJustification.objects.filter(
                    inner_query
                )  # pylint: disable=no-member
                .order_by(models.F("timestamp").desc())[:1]
                .values("text")
            )
        )


class Entity(EntityAbstract):
    "Django ORM model for entities"

    objects = EntityQueryset.as_manager()

    class Meta:
        "Meta class for entity model"

        # pylint: disable=too-few-public-methods
        managed = False

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        return cls.objects.by_id_persistent(id_persistent).get()

    def has_write_access(self, _user: CosmaeUser):
        "Check wether a user can change the entity."
        return True


class EntityJustification(models.Model):
    """Django ORM model for justifications why an entity exists in the database."""

    id_entity_persistent = models.CharField(max_length=36)
    text = models.TextField()
    timestamp = models.DateTimeField()
    id_persistent = models.CharField(max_length=36, primary_key=True)
    author = models.ForeignKey(
        "cosmae.CosmaeUser", null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        "Meta class for entity model"

        # pylint: disable=too-few-public-methods
        indexes = [
            # Possible alternative gin index with `opclasses=["gin_trgrm_ops"],
            # Would mean faster retrieval but increased size and update time.
            # Needs to add extension via migration.
            GistIndex(
                fields=["text"],
            ),
        ]

    class EmptyJustificationException(Exception):
        "Indicates the attempt of adding a justification with no text"

    class NoJustificationException(Exception):
        "Indicates that there is no justification stored."

    @classmethod
    def for_id_entity_persistent_unordered(
        cls, id_entity_persistent, until_time: datetime | None = None
    ):
        "Get all justifications for an entity unordered"
        query = models.Q(id_entity_persistent=id_entity_persistent)
        if until_time is not None:
            query &= models.Q(timestamp__lte=until_time)
        return cls.objects.filter(query)  # pylint: disable=no-member

    @classmethod
    def for_id_entity_persistent_asc(
        cls, id_entity_persistent, up_until_time: datetime | None = None
    ):
        "Get all justifications for an entity ordered ascending by date."
        return cls.for_id_entity_persistent_unordered(
            id_entity_persistent, up_until_time
        ).order_by(models.F("timestamp").asc())

    @classmethod
    def for_id_entity_persistent_desc(cls, id_entity_persistent):
        "Get all justifications for an entity ordered descending by date."
        return cls.for_id_entity_persistent_unordered(id_entity_persistent).order_by(
            models.F("timestamp").desc()
        )

    @classmethod
    def add(
        cls,
        id_persistent: str,
        id_entity_persistent: str,
        text: Optional[str],
        timestamp: datetime,
        author: CosmaeUser,
    ):
        # pylint: disable=too-many-arguments,too-many-positional-arguments
        "Add a new entity justification."
        if text is None or text.strip() == "":
            raise cls.EmptyJustificationException()
        existing_queryset = cls.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=id_entity_persistent, text__search=text
        )
        if len(existing_queryset) > 0:
            existing = existing_queryset[0]
            if existing.text == text:
                return existing, False
        return (
            cls.objects.create(  # pylint: disable=no-member
                id_persistent=id_persistent,
                id_entity_persistent=id_entity_persistent,
                text=text,
                timestamp=timestamp,
                author=author,
            ),
            True,
        )

    @classmethod
    def copy(
        cls,
        origin_id_persistent: str,
        destination_id_persistent: str,
    ):
        "Copy all justifications for a source entity to a destination entity."
        justifications = EntityJustification.for_id_entity_persistent_unordered(
            origin_id_persistent
        )
        for justification in justifications:
            cls.add(
                uuid4(),
                destination_id_persistent,
                justification.text,
                justification.timestamp,
                justification.author,
            )


class EntityHistory(EntityAbstract, HistoryMixin):
    """Django ORM model for entity history."""

    objects = EntityQueryset.as_manager()

    class Meta:
        "Meta class for entity history."

        indexes = [
            models.Index(fields=["id_persistent"]),
        ]

    @classmethod
    def most_recent_queryset(cls, manager=None, include_disabled=False):
        "Return most recent versions of all_values"
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        most_recent = manager.filter(
            id=models.Subquery(
                manager.filter(id_persistent=models.OuterRef("id_persistent"))
                .values("id_persistent")
                .annotate(max_id=Max("id"))
                .values("max_id")
            )
        )
        if include_disabled:
            return most_recent
        return most_recent.filter(disabled=False)

    @classmethod
    def check_integrity(cls):
        """Check wether the object conforms to implicit assumptions."""

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        return cls.objects.by_id_persistent(id_persistent).most_recent().get()

    def check_different_before_save(self, other):
        """Checks structural equality for two entities.
        Note:
            * The version fields are not compared as this check is intended to
               prevent unnecessary writes.
            * The proxy_type fields are not compared as they are only set
              before writing to the DB.
            * The time_edit fields are not compared as the operation is invalid."""
        return (
            other.id_persistent != self.id_persistent
            or other.display_txt != self.display_txt
            or other.disabled != self.disabled
            or other.contribution_candidate_id
            != self.contribution_candidate_id  # pylint: disable=no-member
            or self.merged_from != other.merged_from
        )


def entity_objects(date: Optional[datetime] = None):
    "Get correct entity query set depending on whether a time limit is set."
    if date is None:
        return Entity.objects
    queryset = EntityHistory.objects.filter(time_edit__lte=date)
    return queryset.filter(
        id=models.Subquery(
            queryset.filter(id_persistent=models.OuterRef("id_persistent"))
            .values("id_persistent")
            .annotate(max_id=Max("id"))
            .values("max_id")
        )
    )
