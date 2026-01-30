"Django ORM models for values."

from __future__ import annotations

from datetime import datetime
from typing import List

from django.db import models
from django.db.models.aggregates import Max

from cosmae.column.models_django import Column, column_objects
from cosmae.entity.models_django import Entity, entity_objects
from cosmae.exception import (
    ColumnDisabledException,
    ColumnMissingException,
    EntityMissingException,
)
from cosmae.util import CosmaeUser
from cosmae.versioned.models_django import HistoryMixin, Versioned, VersionedQueryset


class ValueAbstract(Versioned):
    "Django ORM model for values."

    id_entity_persistent = models.CharField(max_length=36)
    id_column_persistent = models.TextField()
    value = models.TextField(null=True, blank=True)
    merged_from = models.CharField(max_length=36, null=True)

    class Meta:
        "Meta class for abstract Value django model"

        # pylint: disable=too-few-public-methods
        abstract = True

    def __eq__(self, other: object) -> bool:
        comparison = (
            isinstance(other, ValueAbstract)
            and self.id == other.id  # pylint: disable=no-member
            and self.id_persistent == other.id_persistent
            and self.id_entity_persistent == other.id_entity_persistent
            and self.id_column_persistent == other.id_column_persistent
            and self.value == other.value
            and self.time_edit == other.time_edit
            and self.previous_version_id  # pylint: disable=no-member
            == other.previous_version_id
        )
        return comparison


class ValueQuerySet(VersionedQueryset):
    "Custom queryset for recent values"

    def for_entities(
        self, id_column_persistent: str, id_entity_persistent_list: List[str]
    ):
        "Get most recent values for a column, limited by a list of entities."
        return self.filter(  # pylint: disable=no-member
            id_entity_persistent__in=id_entity_persistent_list,
            id_column_persistent=id_column_persistent,
        )

    def search(self, search_term: str, id_columns: None):
        "Search values by a term optionally restricted to a set of columns."
        if id_columns is not None:
            restricted = self.filter(id_column_persistent__in=id_columns)
        else:
            restricted = self
        without_contributed = restricted.alias(
            contribution_candidate=models.Subquery(
                Entity.objects.filter(
                    id_persistent=models.OuterRef("id_entity_persistent")
                ).values("contribution_candidate")
            )
        ).filter(contribution_candidate__isnull=True)
        query = models.Q()
        for term in search_term.split():
            query = query & models.Q(value__icontains=term)
        return without_contributed.filter(query)

    def for_entity_queryset(
        self,
        id_entity_persistent: str,
        _user: CosmaeUser,
        include_disabled: bool = False,
    ):
        "Get all instances for a given entity."
        query = models.Q(id_entity_persistent=id_entity_persistent)
        if not include_disabled:
            query &= models.Q(disabled=False)
        return self.filter(query)

    def by_column_chunked_queryset(self, id_column_persistent, offset, limit):
        "Get values for a column_id in chunks."
        try:
            column = Column.most_recent_by_id(id_column_persistent)
        except Column.DoesNotExist as exc:  # pylint: disable=no-member
            raise ColumnMissingException(id_column_persistent) from exc
        return self.filter(
            id_column_persistent=column.id_persistent, id__gte=offset
        ).order_by("id")[:limit]

    def most_recent_by_entity_and_definition_id_query_set(
        self, id_entity_persistent: str, id_column_persistent: str
    ):
        """Get all most recent values that match a given id_entity_persistent
        and id_entity_persistent."""
        return self.filter(  # pylint: disable=no-member
            id_entity_persistent=id_entity_persistent,
            id_column_persistent=id_column_persistent,
        ).order_by("id")

    def annotate_entity(self, up_until_time: datetime | None = None):
        "Annotate values with the most recent entity and value version"
        entity_sub_query = (
            entity_objects(up_until_time)
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("id_entity_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))[:1]
        )
        return self.annotate(
            entity=models.Subquery(
                # pylint: disable=duplicate-code
                entity_sub_query.values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        display_txt="display_txt",
                        disabled="disabled",
                    )
                )
            ),
        )

    def earliest_value(self):
        "Annotate values with the earliest value for each entity and column"
        earliest_sub_query = self.filter(  # pylint: disable=no-member
            id_entity_persistent=models.OuterRef("id_entity_persistent"),
            id_column_persistent=models.OuterRef("id_column_persistent"),
        ).order_by("time_edit")[:1]
        return self.annotate(
            earliest_id=models.Subquery(earliest_sub_query.values("id")),
        ).filter(id=models.F("earliest_id"))

    def annotate_column(self):
        "Annotate values with the most recent column and value"
        column_sub_query = (
            column_objects()
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("id_column_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))[:1]
        )
        return self.annotate(
            column=models.Subquery(
                # pylint: disable=duplicate-code
                column_sub_query.values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        id_parent_persistent="id_parent_persistent",
                        description="description",
                        name="name",
                        type="type",
                        curated="curated",
                    )
                )
            ),
        )


class ValueHistory(ValueAbstract, HistoryMixin):
    "Provides access to value history"

    objects = ValueQuerySet().as_manager()

    unmodifiable_fields = {
        "id_persistent",
        "id_column_persistent",
    }

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a value."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            models.F("previous_version").desc(nulls_last=True)
        )[0]

    @classmethod
    def most_recent_queryset(cls, manager=None):
        "Return most recent versions of all_values"
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        return manager.filter(
            id=models.Subquery(
                manager.filter(id_persistent=models.OuterRef("id_persistent"))
                .values("id_persistent")
                .annotate(max_id=Max("id"))
                .values("max_id")
            )
        )

    def has_write_access(self, id_user_persistent: str):
        "Check whether a user can write."
        try:
            column = Column.most_recent_by_id(self.id_column_persistent)
        except Column.DoesNotExist:  # pylint: disable=no-member
            return True
        return column.has_write_access(id_user_persistent)

    def check_integrity(  # pylint: disable=too-many-arguments
        self,
    ):
        """Check wether the object conforms to implicit assumptions."""
        try:
            Entity.most_recent_by_id(self.id_entity_persistent)
        except Entity.DoesNotExist as exc:  # pylint: disable=no-member
            raise EntityMissingException(self.id_entity_persistent) from exc
        try:
            column = Column.most_recent_by_id(self.id_column_persistent)
            if column.disabled:
                raise ColumnDisabledException(column.id_persistent)
            column.check_value(self.value)
        except Column.DoesNotExist as exc:  # pylint: disable=no-member
            raise ColumnMissingException(self.id_column_persistent) from exc

    def check_different_before_save(self, other):
        """Checks structural equality for two values."""
        return (
            other.id_entity_persistent != self.id_entity_persistent
            or other.id_column_persistent != self.id_column_persistent
            or other.value != self.value
            or other.merged_from != self.merged_from
        )


class Value(ValueAbstract):
    "Django ORM class for view representing the most recent values."

    objects = ValueQuerySet().as_manager()

    class Meta:
        "Meta class for Value view to ensure django does not create a table."

        # pylint: disable=too-few-public-methods
        managed = False

    @classmethod
    def get_by_id(cls, id_persistent):
        "Get a value by its persistent id"
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        ).get()


def value_objects(date: datetime | None = None):
    "Get Value manager or ValueHistory manager depending on whether a date is provided."
    if date is None:
        return Value.objects
    queryset = ValueHistory.objects.filter(time_edit__lte=date)
    return queryset.filter(
        id=models.Subquery(
            queryset.filter(id_persistent=models.OuterRef("id_persistent"))
            .values("id_persistent")
            .annotate(max_id=Max("id"))
            .values("max_id")[:1]
        )
    )
