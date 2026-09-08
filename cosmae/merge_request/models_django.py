"Django models for merge requests."

from __future__ import annotations

from typing import Optional
from uuid import uuid4

from django.db import models, transaction

from cosmae.column.models_django import Column, ColumnHistory, column_objects
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity, EntityHistory
from cosmae.merge_request.entity.models_django import (
    AbstractConflictResolution,
    AbstractConflictResolutionQuerySet,
    AbstractMergeRequest,
    AbstractMergeRequestQuerySet,
)
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.django import get_json_array_agg
from cosmae.value.models_django import Value, ValueQuerySet, value_objects


class ColumnMergeRequestQuerySet(AbstractMergeRequestQuerySet):
    "QuerySet for column merge requests."

    def created_by_user(self, user: CosmaeUser):
        "Get all merge requests created by a user"
        states = [
            ColumnMergeRequest.State.OPEN,
            ColumnMergeRequest.State.ERROR,
        ]

        created = self.filter(  # pylint: disable=no-member
            created_by=user,
            state__in=states,
        )
        if user.permission_group in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]:
            curated = (
                self.filter(state__in=states)  # pylint: disable=no-member
                .annotate(
                    curated=models.Subquery(
                        Column.query_set()
                        .filter(id_persistent=models.OuterRef("id_origin_persistent"))
                        .values("curated")
                    )
                )
                .filter(curated=True)
            )
            return created.annotate(curated=models.Value(False)).union(curated)
        return created

    def assigned_to_user(self, user: CosmaeUser):
        "Get all merge requests assigned to a user"
        states = [
            ColumnMergeRequest.State.OPEN,
            ColumnMergeRequest.State.ERROR,
        ]

        assigned = self.filter(  # pylint: disable=no-member
            assigned_to=user,
            state__in=states,
        )
        if user.permission_group in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]:
            curated = (
                self.filter(state__in=states)  # pylint: disable=no-member
                .annotate(
                    curated=models.Subquery(
                        Column.query_set()
                        .filter(
                            id_persistent=models.OuterRef("id_destination_persistent")
                        )
                        .values("curated")
                    )
                )
                .filter(curated=True)
            )
            return assigned.annotate(curated=models.Value(False)).union(curated)
        return assigned

    def for_contribution(self, id_contribution_persistent):
        "Get all column merge requests for a contribution candidate."
        return self.filter(  # pylint: disable=no-member
            contribution_candidate_id=id_contribution_persistent
        )


class InstanceConflictQuerySet(ValueQuerySet):
    "QuerySet for instance conflicts."

    def __init__(self, model=None, query=None, using=None, hints=None):
        super().__init__(model=model, query=query, using=using, hints=hints)

    def unresolved(
        self, resolution_values: models.BaseManager[ColumnConflictResolution]
    ):
        "Exclude resolved conflicts from the queryset."
        resolutions_sub_query = resolution_values.filter(
            # make sure to use ids to register changed data
            models.Q(
                column_origin__id_persistent=models.OuterRef("id_column_persistent")
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
                    conflict_resolution_replacement_state=ColumnConflictResolution.VALUE
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


class ColumnMergeRequest(AbstractMergeRequest):
    "Django model for a merge request."

    objects = ColumnMergeRequestQuerySet.as_manager()

    assigned_to = models.ForeignKey(
        "CosmaeUser",
        related_name="+",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    contribution_candidate = models.ForeignKey(
        "ContributionCandidate",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    disable_origin_on_merge = models.BooleanField(default=False)

    def has_read_access(self, user: CosmaeUser):
        "Check wether a user can read the merge request."
        return (
            # pylint:disable-next=consider-using-in
            self.created_by == user
            or self.assigned_to == user
            or (
                self.assigned_to is None
                and user.permission_group
                in {CosmaeUser.COMMISSIONER, CosmaeUser.EDITOR}
            )
        )

    def resolve(  # pylint: disable=too-many-arguments, too-many-positional-arguments
        self,
        id_entity_persistent,
        id_column_origin_persistent,
        id_value_origin_persistent,
        id_column_destination_persistent,
        id_entity_version,
        id_column_origin_version,
        id_value_origin_version,
        id_column_destination_version,
        id_value_destination_version,
        replacement_state,
        replacement_value,
    ):
        "Resolve a conflict for this merge request."
        with transaction.atomic():
            ColumnConflictResolution.objects.filter(  # pylint: disable=no-member
                entity__id_persistent=id_entity_persistent,
                column_origin__id_persistent=(id_column_origin_persistent),
                value_origin__id_persistent=id_value_origin_persistent,
                column_destination__id_persistent=(id_column_destination_persistent),
                merge_request=self,
            ).delete()
            resolution = ColumnConflictResolution(
                entity_id=id_entity_version,
                column_origin_id=id_column_origin_version,
                value_origin_id=id_value_origin_version,
                column_destination_id=id_column_destination_version,
                value_destination_id=id_value_destination_version,
                merge_request=self,
                replacement_state=replacement_state,
                replacement_value=replacement_value,
            )
            resolution.save()

    @classmethod
    def create(
        cls,
        id_origin_persistent: str,
        id_destination_persistent: str,
        created_by: CosmaeUser,
    ):
        "Create a new merge request."
        column_origin = column_objects().by_id_persistent(id_origin_persistent).get()
        column_destination = (
            column_objects().by_id_persistent(id_destination_persistent).get()
        )
        if not (
            column_origin.has_write_access(created_by.id_persistent)
            or column_destination.has_write_access(created_by.id_persistent)
        ):
            raise PermissionError(
                f"User {created_by} does not have write access to the columns."
            )
        merge_request = ColumnMergeRequest(
            id_origin_persistent=id_origin_persistent,
            id_destination_persistent=id_destination_persistent,
            created_by=created_by,
            assigned_to=column_destination.owner,
            created_at=timestamp(),
            id_persistent=uuid4(),
            state=ColumnMergeRequest.State.CONFLICTS,
        )
        merge_request.save()
        return merge_request

    @classmethod
    def change_assigned_for_column(
        cls,
        id_column_persistent: str,
        created_by: CosmaeUser,
        assigned_to: Optional[CosmaeUser],
    ):
        """Change the owner for all merge requests that have
        a specific column as destination."""
        cls.objects.filter(  # pylint: disable=no-member
            id_destination_persistent=id_column_persistent
        ).update(assigned_to=assigned_to)
        cls.objects.filter(  # pylint: disable=no-member
            id_origin_persistent=id_column_persistent,
        ).update(created_by=created_by)

    @classmethod
    def get_columns_for_entities_request(
        cls,
        id_column_persistent: str,
        id_contribution_persistent: Optional[str],
        id_merge_request_persistent: Optional[str],
        user: CosmaeUser,
    ):
        """Get the columns relevant for an entities focused value request.
        returns:
        A set of tuples. The first element is the id of the column.
        The second element indicates whether this is existing data."""
        contribution = None
        if id_contribution_persistent is None:
            if id_merge_request_persistent is None:
                return {(id_column_persistent, True)}
            merge_request = ColumnMergeRequest.by_id_persistent(
                id_merge_request_persistent, user
            )
            if merge_request.contribution_candidate:
                contribution = merge_request.contribution_candidate
            elif (
                # pylint:disable-next=consider-using-in
                merge_request.id_destination_persistent == id_column_persistent
                or merge_request.id_origin_persistent == id_column_persistent
            ):
                return {
                    (merge_request.id_destination_persistent, True),
                    (merge_request.id_origin_persistent, False),
                }
        else:
            contribution = ContributionCandidate.by_id_persistent(
                id_contribution_persistent, user
            ).get()
        if contribution is not None:
            merge_requests_manager = contribution.columnmergerequest_set
            for merge_request in merge_requests_manager.iterator():
                if (
                    # pylint:disable-next=consider-using-in
                    merge_request.id_origin_persistent == id_column_persistent
                    or merge_request.id_destination_persistent == id_column_persistent
                ) and (
                    # pylint:disable-next=consider-using-in
                    merge_request.assigned_to == user
                    or merge_request.created_by == user
                ):
                    # There can't be a duplicate assignment.
                    # Therefore it is safe to return early
                    return {
                        (merge_request.id_destination_persistent, True),
                        (merge_request.id_origin_persistent, False),
                    }
        return {(id_column_persistent, True)}

    def compute_instance_conflicts(
        self, min_idx: int = 0, limit: Optional[int] = None
    ) -> InstanceConflictQuerySet:
        "Compute the conflicts for this merge request."
        instance_origin_recent_query = value_objects().filter(
            id_column_persistent=self.id_origin_persistent, id__gte=min_idx
        )

        instance_destination_recent_query = value_objects().filter(
            id_column_persistent=self.id_destination_persistent
        )
        conflicts_sub_query = instance_destination_recent_query.filter(
            id_entity_persistent=models.OuterRef("id_entity_persistent")
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

    @classmethod
    def contribution_with_match_columns(cls, id_contribution_persistent):
        "Gets the columns that were used for matching in a specific contribution."
        return ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=id_contribution_persistent,
            mark_delete=False,
        ).annotate(
            matched_columns=models.Subquery(
                ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
                    contribution_candidate_id=models.OuterRef("id_persistent")
                )
                .annotate(
                    column_json=models.Subquery(
                        Column.query_set()
                        .filter(
                            curated=True,
                            id_persistent=models.OuterRef("id_destination_persistent"),
                        )
                        .values(
                            column_json=models.functions.JSONObject(
                                id="id",
                                id_persistent="id_persistent",
                                id_parent_persistent="id_parent_persistent",
                                name="name",
                                type="type",
                                description="description",
                                curated="curated",
                                owner="owner",
                                hidden="hidden",
                                disabled="disabled",
                            )
                        )
                        .filter(column_json__isnull=False)
                    )
                )
                .values("contribution_candidate_id")
                .annotate(
                    json_column_list=get_json_array_agg()("column_json", default=[])
                )
                .values("json_column_list")
            )
        )


class ColumnConflictResolutionQuerySet(AbstractConflictResolutionQuerySet):
    "Query set for column conflict resolutions."

    def annotate_most_recent_ids(self):
        """Annotate the queryset with the ids of most recent versions,
        Also adds value information for the instance origin"""
        return self.annotate_instance_origin_most_recent(
            id_entity_most_recent=Entity.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("entity__id_persistent")
            ).values("id")[:1],
            id_column_origin_most_recent=column_objects()
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("column_origin__id_persistent")
            )
            .values("id")[:1],
            id_column_destination_most_recent=column_objects()
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("column_destination__id_persistent")
            )
            .values("id")[:1],
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
                        id_entity_persistent=models.OuterRef("entity__id_persistent"),
                        id_column_persistent=models.OuterRef(
                            "merge_request__id_destination_persistent"
                        ),
                    )
                ).values("id")[:1]
            ),
        )

    def non_recent(self):
        """Get the conflict resolutions that reference not up to date entities,
        column or values."""
        with_version_info = self.annotate_most_recent_ids()
        non_recent_query_set = with_version_info.filter(
            ~models.Q(entity__id=models.F("id_entity_most_recent"))
            | ~models.Q(column_origin_id=models.F("id_column_origin_most_recent"))
            | ~models.Q(
                column_destination_id=models.F("id_column_destination_most_recent")
            )
            | self.instance_non_recent_predicate
        )
        with_data = non_recent_query_set.annotate(
            value_destination_most_recent=models.Subquery(
                Value.objects.filter(  # pylint: disable=no-member
                    id=models.OuterRef("id_value_destination_most_recent")
                ).values(
                    json=models.functions.JSONObject(
                        id="id", id_persistent="id_persistent", value="value"
                    )
                )[
                    :1
                ]
            ),
            entity_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id=models.OuterRef("id_entity_most_recent")
                ).values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        display_txt="display_txt",
                        disabled="disabled",
                    )
                )[
                    :1
                ]
            ),
        )
        without_same_values = with_data.exclude(
            value_destination_most_recent__value=models.F(
                "value_origin_most_recent__value"
            )
        )
        return without_same_values

    def only_recent(self):
        """Get the conflict resolutions that reference not up to date entities,
        column or values."""
        with_most_recent_ids = self.annotate_most_recent_ids()
        return with_most_recent_ids.filter(
            models.Q(entity__id=models.F("id_entity_most_recent"))
            & models.Q(column_origin__id=models.F("id_column_origin_most_recent"))
            & models.Q(
                column_destination__id=models.F("id_column_destination_most_recent")
            )
            & models.Q(
                value_origin__id=models.functions.Cast(
                    models.F("value_origin_most_recent__id"), models.BigIntegerField()
                )
            )
            & (
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


class ColumnConflictResolution(AbstractConflictResolution):
    "Django ORM model for resolutions to merge request conflicts."

    objects = ColumnConflictResolutionQuerySet.as_manager()

    # do not use persistent ids in order to allow change detection.
    entity = models.ForeignKey(
        EntityHistory, on_delete=models.CASCADE, related_name="+"
    )
    column_destination = models.ForeignKey(
        ColumnHistory, on_delete=models.CASCADE, related_name="+"
    )
    column_origin = models.ForeignKey(
        ColumnHistory, on_delete=models.CASCADE, related_name="+"
    )
    merge_request = models.ForeignKey(ColumnMergeRequest, on_delete=models.CASCADE)

    @classmethod
    def for_merge_request_query_set(cls, merge_request: ColumnMergeRequest):
        "Get resolutions for a merge request."
        return cls.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request
        )
