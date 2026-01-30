"""Models for entities."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from django.db import models
from django.db.models.aggregates import Max

from cosmae.entity.queryset import EntityQueryset
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
            .values("max_id")[:1]
        )
    )
