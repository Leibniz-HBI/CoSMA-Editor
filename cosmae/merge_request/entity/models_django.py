"Models for entity merge requests."

from __future__ import annotations

from typing import Optional

from django.db import models

from cosmae.column.models_django import Column, ColumnHistory, column_objects
from cosmae.entity.models_django import Entity, EntityHistory
from cosmae.exception import ForbiddenException
from cosmae.util import CosmaeUser
from cosmae.value.models_django import Value, ValueHistory


class AbstractMergeRequestQuerySet(models.QuerySet):
    "Query set for abstract merge requests."

    def by_id_persistent(self, id_persistent: str):
        "Query set containing the the merge request referenced by the id give as argument."
        return self.filter(id_persistent=id_persistent)  # pylint: disable=no-member

    def created_by_user(self, user: CosmaeUser):
        "Get all merge requests created by a user"
        return self.filter(  # pylint: disable=no-member
            created_by=user,
            state__in=[
                self.model.State.OPEN,
                self.model.State.CONFLICTS,
                self.model.State.ERROR,
            ],
        )


class AbstractMergeRequest(models.Model):
    "Abstract Django model for a base merge request."

    objects = AbstractMergeRequestQuerySet.as_manager()

    class State(models.TextChoices):
        "Enum for merge request states."

        CREATED = "CRT", "created"
        OPEN = "OPN", "open"
        CONFLICTS = "CNF", "conflicts"
        CLOSED = "CLS", "closed"
        RESOLVED = "RSL", "resolved"
        MERGED = "MRG", "merged"
        ERROR = "ERR", "error"

    id_destination_persistent = models.TextField()
    id_origin_persistent = models.TextField()
    created_by = models.ForeignKey(
        "CosmaeUser", related_name="+", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField()
    id_persistent = models.UUIDField(primary_key=True)
    state = models.TextField(max_length=3, choices=State, default=State.OPEN)

    class Meta:
        "Meta class for abstract merge request django model"

        # pylint: disable=too-few-public-methods
        abstract = True

    @classmethod
    def by_id_persistent(cls, id_persistent: str, user: CosmaeUser):
        "Get a merge request by id_persistent"
        merge_request = cls.objects.by_id_persistent(id_persistent).get()
        if merge_request.has_read_access(user):
            return merge_request
        raise ForbiddenException("merge request", merge_request.id_persistent)


class AbstractConflictResolutionQuerySet(models.QuerySet):
    "Query set for abstract conflict resolutions."

    instance_non_recent_predicate = (
        (
            models.Q(value_destination__isnull=False)
            & ~models.Q(
                value_destination__id=models.functions.Cast(
                    models.F("id_value_destination_most_recent"),
                    models.BigIntegerField(),
                ),
            )
        )
        | models.Q(
            value_destination__isnull=True,
            id_value_destination_most_recent__isnull=False,
        )
        | ~models.Q(
            value_origin__id=models.functions.Cast(
                models.F("value_origin_most_recent__id"),
                models.BigIntegerField(),
            )
        )
    )

    def annotate_instance_origin_most_recent(self, **additional_annotations):
        "Annotate a conflict with the most recent instances"
        return self.annotate(
            value_origin_most_recent=models.Subquery(
                Value.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("value_origin__id_persistent")
                ).values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        value="value",
                    )
                )[
                    :1
                ]
            ),
            **additional_annotations,
        )


class AbstractConflictResolution(models.Model):
    "Django ORM model for resolutions to merge request conflicts."

    objects = AbstractConflictResolutionQuerySet.as_manager()

    # do not use persistent ids in order to allow change detection.
    value_destination = models.ForeignKey(
        ValueHistory,
        on_delete=models.CASCADE,
        related_name="+",
        null=True,
        blank=True,
    )
    value_origin = models.ForeignKey(
        ValueHistory,
        on_delete=models.CASCADE,
        related_name="+",
        null=True,
        blank=True,
    )
    KEEP = "KEEP"
    REPLACE = "RPLC"
    VALUE = "VALU"
    replacement_state = models.CharField(
        max_length=5,
        choices=[
            (KEEP, "keep existing"),
            (REPLACE, "new value"),
            (VALUE, "replacement value"),
        ],
        default=None,
        null=True,
    )
    replacement_value = models.TextField(default=None, null=True)

    class Meta:
        # pylint: disable=too-few-public-methods
        "Meta class for abstract merge request django model"
        abstract = True


class EntityMergeRequestQuerySet(AbstractMergeRequestQuerySet):
    "Query set for entity merge requests."

    def get_existing(
        self, id_entity_origin_persistent, id_entity_destination_persistent
    ):
        """Get the query set of existing entity merge requests
        with same origin and and destination ids."""
        return self.filter(  # pylint: disable=no-member
            id_origin_persistent=id_entity_origin_persistent,
            id_destination_persistent=id_entity_destination_persistent,
        )


class EntityMergeRequest(AbstractMergeRequest):
    "Django model for entity merge requests."

    objects = EntityMergeRequestQuerySet.as_manager()

    def has_read_access(self, user):
        "Check if a user can read entity merge requests."
        return user.permission_group in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]

    def swap_origin_destination(self):
        "Swap origin and destination of the entity merge request."
        id_tmp = self.id_origin_persistent
        self.id_origin_persistent = self.id_destination_persistent
        self.id_destination_persistent = id_tmp
        self.entityconflictresolution_set.update(  # pylint: disable=no-member
            replacement_state=models.Case(
                models.When(
                    replacement_state=EntityConflictResolution.REPLACE,
                    then=models.Value(EntityConflictResolution.KEEP),
                ),
                models.When(
                    replacement_state=EntityConflictResolution.KEEP,
                    then=models.Value(EntityConflictResolution.REPLACE),
                ),
                default=models.F("replacement_state"),
            ),
            replacement_value=models.F("replacement_value"),
            entity_origin=models.F("entity_destination"),
            entity_destination=models.F("entity_origin"),
            value_origin=models.F("value_destination"),
            value_destination=models.F("value_origin"),
        )
        self.save()

    def instance_conflicts_all(
        self,
        include_resolved: bool = False,
        resolution_values: Optional[
            models.BaseManager[EntityConflictResolution]
        ] = None,
    ):
        """Get conflicts to merging the origin entity referenced by the merge request
        into the destination entity"""
        instance_origin_recent_query = (
            Value.objects_all()
            .annotate(
                column_disabled=models.Subquery(
                    column_objects(include_disabled=True)
                    .filter(id_persistent=models.OuterRef("id_column_persistent"))
                    .values("disabled")
                )
            )
            .filter(
                id_entity_persistent=self.id_origin_persistent,
                column_disabled=False,
            )
        )
        if len(instance_origin_recent_query) == 0:
            return instance_origin_recent_query

        instance_destination_recent_query = Value.objects_all().filter(
            id_entity_persistent=self.id_destination_persistent
        )
        conflicts_sub_query = instance_destination_recent_query.filter(
            id_column_persistent=models.OuterRef("id_column_persistent")
        )

        if resolution_values is None:
            resolution_values = (
                EntityConflictResolution.objects.none()  # pylint: disable=no-member
            )
        resolutions_sub_query = resolution_values.filter(
            entity_origin__id_persistent=models.OuterRef("id_entity_persistent"),
            value_origin__id_persistent=models.OuterRef("id_persistent"),
        )
        conflict_candidate_query = instance_origin_recent_query.annotate(
            value_destination=models.Subquery(
                conflicts_sub_query.values(
                    json=models.functions.JSONObject(
                        id="id", id_persistent="id_persistent", value="value"
                    )
                )
            ),
            conflict_resolution_replacement_state=models.Subquery(
                resolutions_sub_query.values("replacement_state")
            ),
            conflict_resolution_replacement_value=models.Subquery(
                resolutions_sub_query.values("replacement_value")
            ),
        )
        with_conflict_info = conflict_candidate_query.exclude(
            models.Q(
                value_destination__isnull=False,
                value=models.fields.json.KT("value_destination__value"),
            )
        )
        if include_resolved:
            return with_conflict_info

        return with_conflict_info.exclude(
            conflict_resolution_replacement_state__isnull=False
        )

    def resolvable_unresolvable_updated(
        self: EntityMergeRequest,
        column_query_set: models.BaseManager[Column],
    ):
        "Get conflicts for a merge request"
        resolutions = EntityConflictResolution.for_merge_request_query_set(self)
        recent = resolutions.only_recent()
        updated_query_set = resolutions.non_recent()
        conflict_query_set = self.instance_conflicts_all(
            True, resolution_values=recent
        ).annotate_column()
        with_user_column_id = conflict_query_set.annotate(
            id_column_most_recent_persistent=models.fields.json.KT(
                "column__id_persistent"
            )
        ).annotate(
            writable_column_id=models.Subquery(
                column_query_set.filter(
                    id_persistent=models.OuterRef("id_column_most_recent_persistent")
                ).values("id")[:1]
            )
        )
        resolvable_conflicts = with_user_column_id.filter(
            writable_column_id__isnull=False
        )
        unresolvable_conflicts = with_user_column_id.filter(
            writable_column_id__isnull=True
        )
        # need to filter updated for resolvable
        updated_resolvable = (
            updated_query_set.annotate(
                id_column_most_recent=models.functions.Cast(
                    "column_most_recent__id", models.BigIntegerField()
                )
            )
            .annotate(
                writable_column_id=models.Subquery(
                    column_query_set.filter(
                        id=models.OuterRef("id_column_most_recent")
                    ).values("id")[:1]
                )
            )
            .filter(writable_column_id__isnull=False)
        )
        return resolvable_conflicts, unresolvable_conflicts, updated_resolvable


class EntityConflictResolutionQuerySet(AbstractConflictResolutionQuerySet):
    "Query set for entity conflict resolutions."

    def non_recent(self):
        """Get the conflict resolutions that reference not up to date entities,
        column or values."""
        with_version_info = self.annotate_instance_origin_most_recent(
            column_most_recent=models.Subquery(
                column_objects()
                .filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("column__id_persistent"),
                    disabled=False,
                )
                .values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        id_parent_persistent="id_parent_persistent",
                        description="description",
                        name="name",
                        type="type",
                        curated="curated",
                        hidden="hidden",
                        disabled="disabled",
                    )
                )[:1]
            ),
            id_entity_origin_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("entity_origin__id_persistent")
                ).values("id")[:1]
            ),
            id_entity_destination_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("entity_destination__id_persistent")
                ).values("id")[:1]
            ),
            id_value_destination_most_recent=models.Subquery(
                Value.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("value_destination__id_persistent")
                ).values("id")[:1]
            ),
        )
        non_recent_query_set = with_version_info.filter(
            ~models.Q(
                column__id=models.functions.Cast(
                    models.F("column_most_recent__id"), models.BigIntegerField()
                )
            )
            | ~models.Q(
                entity_origin__id=models.functions.Cast(
                    models.F("id_entity_origin_most_recent"),
                    models.BigIntegerField(),
                ),
            )
            | ~models.Q(
                entity_destination__id=models.functions.Cast(
                    models.F("id_entity_destination_most_recent"),
                    models.BigIntegerField(),
                ),
            )
            | self.instance_non_recent_predicate
        )
        with_value_destination = non_recent_query_set.annotate(
            value_destination_most_recent_value=models.Subquery(
                Value.objects.filter(  # pylint: disable=no-member
                    id=models.OuterRef("id_value_destination_most_recent")
                ).values("value")[:1]
            )
        )
        return with_value_destination.exclude(
            value_destination_most_recent_value=models.functions.Cast(
                models.F("value_origin_most_recent__value"), models.TextField()
            )
        )

    def only_recent(self):
        """Get the conflict resolutions that reference not up to date entities,
        column or values."""
        with_column_version_info = self.annotate(
            id_column_most_recent=column_objects()
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("column__id_persistent")
            )
            .values("id")[:1]
        )
        only_with_recent_columns = with_column_version_info.filter(
            column__id=models.F("id_column_most_recent")
        )
        with_entity_origin_version_info = only_with_recent_columns.annotate(
            id_entity_origin_most_recent=Entity.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("entity_origin__id_persistent")
            ).values(
                "id"
            )[
                :1
            ]
        )
        only_with_recent_entity_origins = with_entity_origin_version_info.filter(
            entity_origin__id=models.F("id_entity_origin_most_recent")
        )
        with_entity_destination_version_info = only_with_recent_entity_origins.annotate(
            id_entity_destination_most_recent=Entity.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("entity_destination__id_persistent")
            ).values(
                "id"
            )[
                :1
            ]
        )
        only_with_recent_entity_destinations = (
            with_entity_destination_version_info.filter(
                entity_destination__id=models.F("id_entity_destination_most_recent")
            )
        )
        with_instance_origin_version_info = only_with_recent_entity_destinations.annotate(
            id_value_origin_most_recent=Value.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("value_origin__id_persistent")
            ).values(
                "id"
            )[
                :1
            ]
        )
        only_with_recent_instance_origin = with_instance_origin_version_info.filter(
            value_origin__id=models.F("id_value_origin_most_recent")
        )
        with_instance_destination_version_info = only_with_recent_instance_origin.annotate(
            id_value_destination_most_recent=models.Subquery(
                Value.objects.filter(  # pylint: disable=no-member
                    models.Q(
                        id_persistent=models.OuterRef(
                            "value_destination__id_persistent"
                        )
                    )
                    | models.Q(
                        # case when value destination is null
                        # therefore use entity information
                        # and column information from merge request!
                        id_column_persistent=models.OuterRef("column__id_persistent"),
                        id_entity_persistent=models.OuterRef(
                            "merge_request__id_destination_persistent"
                        ),
                    )
                ).values("id")[:1]
            )
        )
        only_with_recent_instance_destination = (
            with_instance_destination_version_info.filter(
                models.Q(
                    id_value_destination_most_recent__isnull=False,
                    value_destination__id=models.F("id_value_destination_most_recent"),
                )
                | models.Q(
                    value_destination__isnull=True,
                    id_value_destination_most_recent__isnull=True,
                )
            )
        )
        return only_with_recent_instance_destination


class EntityConflictResolution(AbstractConflictResolution):
    "Django model for entity conflict resolutions."

    objects = EntityConflictResolutionQuerySet.as_manager()

    merge_request = models.ForeignKey(EntityMergeRequest, on_delete=models.CASCADE)
    entity_origin = models.ForeignKey(
        EntityHistory, on_delete=models.CASCADE, related_name="+"
    )
    entity_destination = models.ForeignKey(
        EntityHistory, on_delete=models.CASCADE, related_name="+"
    )
    column = models.ForeignKey(
        ColumnHistory, on_delete=models.CASCADE, related_name="+"
    )

    @classmethod
    def for_merge_request_query_set(cls, merge_request: EntityMergeRequest):
        "Get resolutions for a merge request."
        return cls.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request
        ).filter(value_origin__isnull=False)
