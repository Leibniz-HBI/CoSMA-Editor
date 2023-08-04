"""Models for entities."""
from datetime import datetime
from typing import Optional

from django.contrib.postgres.indexes import GistIndex
from django.db import models
from django.db.models.aggregates import Max

from cosmae.exception import DbObjectExistsException
from cosmae.util.django import change_or_create_versioned


class Entity(models.Model):
    """Model for a general entity"""

    proxy_name = models.TextField()
    display_txt = models.TextField()
    time_edit = models.DateTimeField()
    id_persistent = models.TextField(null=False, blank=False)
    previous_version = models.ForeignKey(
        "self", blank=True, null=True, on_delete=models.CASCADE, unique=True
    )
    contribution_candidate = models.ForeignKey(
        "ContributionCandidate", blank=True, null=True, on_delete=models.CASCADE
    )

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
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            models.F("previous_version").desc(nulls_last=True)
        )[0]

    @classmethod
    def change_or_create(
        cls,
        id_persistent: str,
        time_edit: datetime,
        display_txt: str,
        version: Optional[int] = None,
        **kwargs,
    ):
        """Changes an entity in the database by adding a new version.
        Note:
            The resulting object is not saved.
        Returns:
            The new object
            and a flag indicating wether the object changed from the most recent version.
        """
        try:
            return change_or_create_versioned(
                cls,
                id_persistent,
                version,
                display_txt=display_txt,
                time_edit=time_edit,
                **kwargs,
            )
        except DbObjectExistsException as exc:
            raise DbObjectExistsException(display_txt) from exc

    @classmethod
    def most_recent(cls, manager):
        "Get all most recent entities"
        return manager.filter(
            id=models.Subquery(
                manager.filter(id_persistent=models.OuterRef("id_persistent"))
                .values("id_persistent")
                .annotate(max_id=Max("id"))
                .values("max_id")
            )
        )

    @classmethod
    def get_most_recent_chunked(cls, offset, limit, manager=None):
        """Get all entities in chunks"""
        # pylint: disable=no-member
        if manager is None:
            manager = cls.objects
        return cls.most_recent(manager)[offset : offset + limit]

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
        if other.id_persistent != self.id_persistent:
            return True
        if other.display_txt != self.display_txt:
            return True
        return False
