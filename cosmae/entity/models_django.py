"""Models for entities."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from django.contrib.postgres.indexes import GistIndex
from django.db import models
from django.db.models.aggregates import Max

from cosmae.util import CosmaeUser
from cosmae.versioned.models_django import HistoryMixin, Versioned


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


class EntityQueryset(models.QuerySet):
    "Custom queryset for recent entities"

    def search(self, search_term: str):
        "search for entities by display text."
        query = models.Q()
        for term in search_term.split():
            query = query & models.Q(display_txt__icontains=term)
        return self.filter(query)

    def chunk(self, offset: int, limit=int, do_not_include_contributed=True):
        "Get a portion of entities"
        manager = self
        if do_not_include_contributed:
            manager = self.filter(
                contribution_candidates__isnull=do_not_include_contributed
            )

        return manager.filter(id__gte=offset).order_by("id")[:limit]


class Entity(EntityAbstract):
    "Django ORM model for entities"

    objects = EntityQueryset.as_manager()

    class Meta:
        "Meta class for entity model"

        # pylint: disable=too-few-public-methods
        managed = False

    @classmethod
    def most_recent_by_id_queryset(cls, id_persistent):
        """Return a query set containing only the most recent version of an entity."""
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        return cls.most_recent_by_id_queryset(id_persistent).get()

    @classmethod
    def most_recent_queryset(cls, manager=None, include_disabled=False):
        "Return most recent versions of all_tag_instances"
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        if include_disabled:
            return manager
        return manager.filter(disabled=False)

    def has_write_access(self, _user: CosmaeUser):
        "Check wether a user can change the entity."
        return True

    @classmethod
    def get_most_recent_chunked(
        cls, offset, limit, manager=None, do_not_include_contributed=False
    ):
        """Get all entities in chunks"""
        entities = cls.most_recent_queryset(manager)
        if do_not_include_contributed:
            entities = entities.filter(
                contribution_candidates__isnull=do_not_include_contributed
            )
        return entities.order_by("id")[offset : offset + limit]


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
    def for_id_entity_persistent_unordered(cls, id_entity_persistent):
        "Get all justifications for an entity unordered"
        return cls.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=id_entity_persistent
        )

    @classmethod
    def for_id_entity_persistent_asc(cls, id_entity_persistent):
        "Get all justifications for an entity ordered ascending by date."
        return cls.for_id_entity_persistent_unordered(id_entity_persistent).order_by(
            models.F("timestamp").asc()
        )

    @classmethod
    def for_id_entity_persistent_desc(cls, id_entity_persistent):
        "Get all justifications for an entity ordered ascending by date."
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
        # pylint: disable=too-many-arguments
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
    def annotate_justification(cls, entities: Optional[models.BaseManager[Entity]]):
        "Annotate the most recent justification for being in the db to a query set of entities."
        if entities is None:
            entities = cls.objects  # pylint: disable=no-member
        return entities.annotate(
            justification_txt=models.Subquery(
                cls.objects.filter(  # pylint: disable=no-member
                    id_entity_persistent=models.OuterRef("id_persistent")
                )
                .order_by(models.F("timestamp").desc())[:1]
                .values("text")
            )
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

    class Meta:
        "Meta class for entity history."

        indexes = [
            models.Index(fields=["id_persistent"]),
        ]

    @classmethod
    def most_recent_queryset(cls, manager=None, include_disabled=False):
        "Return most recent versions of all_tag_instances"
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
    def most_recent_by_id_queryset(cls, id_persistent):
        """Return a query set containing only the most recent version of an entity."""
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        ).order_by(models.F("previous_version").desc(nulls_last=True))[:1]

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        return cls.most_recent_by_id_queryset(id_persistent).get()

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
