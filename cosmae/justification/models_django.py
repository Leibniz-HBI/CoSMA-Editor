"Django ORM model for justifications why an entity exists in the database." ""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from django.contrib.postgres.indexes import GistIndex
from django.db import models

from cosmae.util import CosmaeUser


class EntityJustification(models.Model):
    """Django ORM model for justifications why an entity exists in the database."""

    id_entity_persistent = models.CharField(max_length=36)
    text = models.TextField()
    timestamp = models.DateTimeField()
    id_persistent = models.CharField(max_length=36, primary_key=True)
    author = models.ForeignKey(
        "cosmae.CosmaeUser", null=True, blank=True, on_delete=models.SET_NULL
    )
    author_session = models.ForeignKey(
        "cosmae.EditSession", null=True, blank=True, on_delete=models.SET_NULL
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
