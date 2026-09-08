"Models for entity merge requests."

from __future__ import annotations

from typing import Optional

from django.db import models

from cosmae.column.models_django import Column, ColumnHistory, column_objects
from cosmae.entity.models_django import Entity, EntityHistory
from cosmae.exception import ForbiddenException
from cosmae.util import CosmaeUser
from cosmae.value.models_django import Value, ValueHistory, ValueQuerySet, value_objects


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
        """Enum for merge request states."""

        CREATED = "CRT", "created"
        """Newly created merge request not yet available for processing.
        E.g., due to not yet merged entities or columns. This state is not visible to users."""
        OPEN = "OPN", "open"
        "Can be edited by users"
        CONFLICTS = "CNF", "conflicts"
        "The System computes the conflicts"
        CLOSED = "CLS", "closed"
        "The merge request is closed and cannot be edited by users"
        RESOLVED = "RSL", "resolved"
        "All conflicts have been resolved and the merge request is ready for merging."
        MERGED = "MRG", "merged"
        "The merge request was merged into the destination."
        ERROR = "ERR", "error"
        "There was an error during the processing of the merge request."

    id_destination_persistent = models.TextField()
    id_origin_persistent = models.TextField()
    created_by = models.ForeignKey(
        "CosmaeUser", related_name="+", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField()
    id_persistent = models.UUIDField(primary_key=True)
    state = models.TextField(max_length=3, choices=State, default=State.CREATED)
    approved_by_session = models.ForeignKey(
        "EditSession",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        default=None,
    )

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


class InstanceConflictQuerySet(ValueQuerySet):
    "QuerySet for instance conflicts."

    def __init__(self, model=None, query=None, using=None, hints=None):
        super().__init__(model=model, query=query, using=using, hints=hints)

    def unresolved(
        self, resolution_values: models.BaseManager[EntityConflictResolution]
    ):
        "Exclude resolved conflicts from the queryset."
        resolutions_sub_query = resolution_values.filter(
            # make sure to use ids to register changed data
            models.Q(
                entity_origin__id_persistent=models.OuterRef("id_entity_persistent")
            )
            & models.Q(value_origin__id=models.OuterRef("id"))
            & (  # make sure both are null or they are equal
                (  # To check whether both are null, check that one is null and bot are equal,
                    # as there is no direct access to the outer ref value.
                    models.Q(value_destination__isnull=True)
                )
                | models.Q(
                    value_destination_id=models.functions.Cast(
                        models.OuterRef("value_destination__id"),
                        models.BigIntegerField(),
                    )
                )
            ),
        )
        with_resolutions = self.annotate(
            conflict_resolution_replacement_state=models.functions.Cast(
                models.Subquery(resolutions_sub_query.values("replacement_state")),
                models.CharField(max_length=5),
            ),
            conflict_resolution_replacement_value=models.functions.Cast(
                models.Subquery(resolutions_sub_query.values("replacement_value")),
                models.TextField(),
            ),
            conflict_resolution_value_destination=models.Subquery(
                resolutions_sub_query.values("value_destination_id")
            ),
        )
        invalid_resolutions = with_resolutions.filter(
            # no resolution exists
            models.Q(conflict_resolution_replacement_state__isnull=True)
            # resolution by value but no value provided
            | (
                models.Q(
                    conflict_resolution_replacement_state=EntityConflictResolution.VALUE
                )
                & (
                    models.Q(conflict_resolution_replacement_value="")
                    | models.Q(conflict_resolution_replacement_value__isnull=True)
                )
            )
            | (
                models.Q(conflict_resolution_value_destination__isnull=True)
                & models.Q(value_destination__isnull=False)
            )
        )
        return invalid_resolutions


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

    def compute_instance_conflicts(
        self, min_idx: int = 0, limit: Optional[int] = None
    ) -> InstanceConflictQuerySet:
        "Compute the conflicts for this merge request."
        instance_origin_recent_query = value_objects().filter(
            id_entity_persistent=self.id_origin_persistent, id__gte=min_idx
        )

        instance_destination_recent_query = value_objects().filter(
            id_entity_persistent=self.id_destination_persistent
        )
        conflicts_sub_query = instance_destination_recent_query.filter(
            id_column_persistent=models.OuterRef("id_column_persistent")
        )
        with_value_destination = instance_origin_recent_query.annotate(
            value_destination=models.Subquery(
                conflicts_sub_query.values(
                    json=models.functions.JSONObject(
                        id="id", id_persistent="id_persistent", value="value"
                    )
                )
            )
        )
        without_equals = with_value_destination.exclude(
            models.Q(
                value_destination__isnull=False,
                value=models.fields.json.KT("value_destination__value"),
            )
        )
        if limit is not None:
            return without_equals.order_by("id")[:limit]
        without_equals.__class__ = InstanceConflictQuerySet
        return without_equals

    def conflicts_unresolvable_updated(
        self: EntityMergeRequest,
        column_query_set: models.BaseManager[Column],
        offset: int = -1,
    ):
        "Get conflicts for a merge request"
        resolutions = (
            EntityConflictResolution.for_merge_request_query_set(self)
            .filter(id__gte=offset)
            .order_by("id")
            .prefetch_related("column")
        )
        updated_query_set = resolutions.non_recent()
        with_user_column_id = resolutions.annotate(
            writable_column_id=models.Subquery(
                column_query_set.filter(
                    id_persistent=models.OuterRef("column__id_persistent")
                ).values("id")[:1]
            )
        )
        unresolvable_conflicts = with_user_column_id.filter(
            writable_column_id__isnull=True
        )
        # need to filter updated for resolvable
        updated_resolvable = updated_query_set.annotate(
            writable_column_id=models.Subquery(
                column_query_set.filter(
                    id_persistent=models.OuterRef("column__id_persistent")
                ).values("id")[:1]
            )
        ).filter(writable_column_id__isnull=False)
        return resolutions, unresolvable_conflicts, updated_resolvable

    def resolve(  # pylint: disable=too-many-arguments,too-many-positional-arguments
        self,
        id_column_persistent,
        id_entity_origin_persistent,
        id_entity_destination_persistent,
        id_value_origin_persistent,
        id_column_version,
        id_entity_origin_version,
        id_entity_destination_version,
        id_value_origin_version,
        id_value_destination_version,
        replacement_state,
        replacement_value,
    ):
        "Resolve a conflict for an entity merge request"
        EntityConflictResolution.objects.filter(  # pylint: disable=no-member
            column__id_persistent=id_column_persistent,
            entity_origin__id_persistent=id_entity_origin_persistent,
            value_origin__id_persistent=id_value_origin_persistent,
            entity_destination__id_persistent=(id_entity_destination_persistent),
            merge_request=self,
        ).delete()
        resolution = EntityConflictResolution(
            column_id=id_column_version,
            entity_origin_id=id_entity_origin_version,
            value_origin_id=id_value_origin_version,
            entity_destination_id=id_entity_destination_version,
            value_destination_id=id_value_destination_version,
            merge_request=self,
            replacement_state=replacement_state,
            replacement_value=replacement_value,
        )
        resolution.save()


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

    _resolved_query = (
        models.Q(replacement_state=AbstractConflictResolution.KEEP)
        | models.Q(replacement_state=AbstractConflictResolution.REPLACE)
        | (
            models.Q(replacement_state=AbstractConflictResolution.VALUE)
            & models.Q(replacement_value__isnull=False)
        )
    )

    def resolved(self):
        "Get the conflict resolutions that have been resolved."

        return self.filter(self._resolved_query)

    def unresolved(self):
        "Get the conflict resolutions that have not been resolved."
        return self.exclude(self._resolved_query)


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
        resolutions = cls.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request
        ).filter(value_origin__isnull=False)
        return resolutions
