"""Models for entities."""

from __future__ import annotations

from typing import Optional

from django.contrib.postgres.indexes import GistIndex
from django.db import models
from django.db.models.aggregates import Max

from cosmae.util import CosmaeUser
from cosmae.versioned.models_django import HistoryMixin, Versioned


class Entity(Versioned, HistoryMixin):
    """Model for a general entity"""

    proxy_name = models.TextField()
    display_txt = models.TextField(blank=True, null=True)
    contribution_candidate = models.ForeignKey(
        "ContributionCandidate", blank=True, null=True, on_delete=models.CASCADE
    )

    unmodifiable_fields = {"id_persistent"}

    class Meta:
        "Meta class for entity model"

        # pylint: disable=too-few-public-methods
        indexes = [
            models.Index(fields=["id_persistent"]),
            # Possible alternative gin index with `opclasses=["gin_trgrm_ops"],
            # Would mean faster retrieval but increased size and update time.
            # Needs to add extension via migration.
            GistIndex(
                fields=["display_txt"],
            ),
        ]

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

    def has_write_access(self, _user: CosmaeUser):
        "Check wether a user can change the entity."
        return True

    @classmethod
    def check_integrity(cls):
        """Check wether the object conforms to implicit assumptions."""

    @classmethod
    def most_recent(cls, manager=None, include_disabled=False):
        "Get all most recent entities"
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
    def get_most_recent_chunked(
        cls, offset, limit, manager=None, do_not_include_contributed=False
    ):
        """Get all entities in chunks"""
        entities = cls.most_recent(manager)
        if do_not_include_contributed:
            entities = entities.filter(
                contribution_candidates__isnull=do_not_include_contributed
            )
        return entities[offset : offset + limit]

    def save(self, *args, **kwargs):
        self.proxy_name = type(self).__name__.lower()
        super().save(*args, **kwargs)

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
        )


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
    def add(cls, id_persistent, id_entity_persistent, text, timestamp, author):
        # pylint: disable=too-many-arguments
        "Add a new entity justification."
        existing_queryset = cls.objects.filter(  # pylint: disable=no-member
            text__search=text
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
