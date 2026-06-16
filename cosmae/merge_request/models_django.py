"Django models for merge requests."

from __future__ import annotations

from typing import Optional

from django.db import models

from cosmae.column.models_django import Column, ColumnHistory, column_objects
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity, EntityHistory
from cosmae.merge_request.entity.models_django import (
    AbstractConflictResolution,
    AbstractMergeRequest,
)
from cosmae.util import CosmaeUser
from cosmae.util.django import get_json_array_agg
from cosmae.value.models_django import Value, value_objects


class ColumnMergeRequest(AbstractMergeRequest):
    "Django model for a merge request."

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

    @classmethod
    def assigned_to_user(cls, user: CosmaeUser):
        "Get all merge requests assigned to a user"
        states = [
            ColumnMergeRequest.OPEN,
            ColumnMergeRequest.CONFLICTS,
            ColumnMergeRequest.ERROR,
        ]

        assigned = ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            assigned_to=user,
            state__in=states,
        )
        if user.permission_group in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]:
            curated = (
                ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
                    state__in=states
                )
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

    @classmethod
    def created_by_user(cls, user: CosmaeUser):
        "Get all merge requests created by a user"
        states = [
            ColumnMergeRequest.OPEN,
            ColumnMergeRequest.CONFLICTS,
            ColumnMergeRequest.ERROR,
        ]

        created = ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
            created_by=user,
            state__in=states,
        )
        if user.permission_group in [CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER]:
            curated = (
                ColumnMergeRequest.objects.filter(  # pylint: disable=no-member
                    state__in=states
                )
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
    def get_for_contribution_query_set(cls, id_contribution_persistent):
        "Get all column merge requests for a contribution candidate."
        return cls.objects.filter(  # pylint: disable=no-member
            contribution_candidate_id=id_contribution_persistent
        )

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

    def instance_conflicts_all(
        self,
        include_resolved: bool = False,
        min_idx: int = 0,
        limit: Optional[int] = None,
        resolution_values: Optional[
            models.BaseManager[ColumnConflictResolution]
        ] = None,
    ):
        """Get conflicts to merging the origin column referenced by the merge request
        into the destination column"""
        instance_origin_recent_query = value_objects().filter(
            id_column_persistent=self.id_origin_persistent, id__gte=min_idx
        )

        if len(instance_origin_recent_query) == 0:
            return instance_origin_recent_query

        instance_destination_recent_query = value_objects().filter(
            id_column_persistent=self.id_destination_persistent
        )
        conflicts_sub_query = instance_destination_recent_query.filter(
            id_entity_persistent=models.OuterRef("id_entity_persistent")
        )

        if resolution_values is None:
            resolution_values = (
                ColumnConflictResolution.objects.none()  # pylint: disable=no-member
            )
        resolutions_sub_query = resolution_values.filter(
            column_origin__id_persistent=models.OuterRef("id_column_persistent"),
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
            conflict_resolution_replacement_state=models.functions.Cast(
                models.Subquery(resolutions_sub_query.values("replacement_state")),
                models.CharField(max_length=5),
            ),
            conflict_resolution_replacement_value=models.functions.Cast(
                models.Subquery(resolutions_sub_query.values("replacement_value")),
                models.TextField(),
            ),
        )
        with_conflict_info = conflict_candidate_query.exclude(
            models.Q(
                value_destination__isnull=False,
                value=models.fields.json.KT("value_destination__value"),
            )
        )
        if not include_resolved:
            with_conflict_info = with_conflict_info.filter(
                models.Q(conflict_resolution_replacement_state__isnull=True)
                | (
                    models.Q(
                        conflict_resolution_replacement_state=ColumnConflictResolution.VALUE
                    )
                    & (
                        models.Q(conflict_resolution_replacement_value="")
                        | models.Q(conflict_resolution_replacement_value__isnull=True)
                    )
                )
            )
        if limit is not None:
            return with_conflict_info.order_by("id")[:limit]
        return with_conflict_info

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


class ColumnConflictResolution(AbstractConflictResolution):
    "Django ORM model for resolutions to merge request conflicts."

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

    @classmethod
    def non_recent(cls, manager=None):
        """Get the conflict resolutions that reference not up to date entities,
        column or values."""
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        with_version_info = cls.annotate_instance_origin_most_recent(
            manager,
            entity_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("entity__id_persistent")
                ).values(  # pylint: disable=duplicate-code
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
            column_origin_most_recent=models.Subquery(
                column_objects()
                .filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("column_origin__id_persistent")
                )
                .values(  # pylint: disable=duplicate-code
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        id_parent_persistent="id_parent_persistent",
                        name="name",
                        type="type",
                    )
                )[:1]
            ),
            column_destination_most_recent=models.Subquery(
                column_objects()
                .filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("column_destination__id_persistent")
                )
                .values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        id_parent_persistent="id_parent_persistent",
                        name="name",
                        type="type",
                    )
                )[:1]
            ),
            value_destination_most_recent=models.Subquery(
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
        )
        non_recent_query_set = with_version_info.filter(
            ~models.Q(
                entity__id=models.functions.Cast(
                    models.F("entity_most_recent__id"), models.BigIntegerField()
                )
            )
            | ~models.Q(
                column_origin__id=models.functions.Cast(
                    models.F("column_origin_most_recent__id"),
                    models.BigIntegerField(),
                ),
            )
            | ~models.Q(
                column_destination__id=models.functions.Cast(
                    models.F("column_destination_most_recent__id"),
                    models.BigIntegerField(),
                ),
            )
            | cls.instance_non_recent_predicate
        )
        return non_recent_query_set.exclude(
            value_origin_most_recent__value=models.F(
                "value_destination_most_recent__value"
            )
        )

    @classmethod
    def only_recent(cls, manager=None):
        """Get the conflict resolutions that reference not up to date entities,
        column or values."""
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        with_entity_version_info = manager.annotate(
            id_entity_most_recent=Entity.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("entity__id_persistent")
            ).values("id")[:1]
        )
        only_with_recent_entities = with_entity_version_info.filter(
            entity__id=models.F("id_entity_most_recent")
        )
        with_column_origin_version_info = only_with_recent_entities.annotate(
            id_column_origin_most_recent=column_objects()
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("column_origin__id_persistent")
            )
            .values("id")[:1]
        )
        only_with_recent_column_origins = with_column_origin_version_info.filter(
            column_origin__id=models.F("id_column_origin_most_recent")
        )
        with_column_destination_version_info = only_with_recent_column_origins.annotate(
            id_column_destination_most_recent=column_objects()
            .filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("column_destination__id_persistent")
            )
            .values("id")[:1]
        )
        only_with_recent_column_destinations = (
            with_column_destination_version_info.filter(
                column_destination__id=models.F("id_column_destination_most_recent")
            )
        )
        with_instance_origin_version_info = only_with_recent_column_destinations.annotate(
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
                        id_entity_persistent=models.OuterRef("entity__id_persistent"),
                        id_column_persistent=models.OuterRef(
                            "merge_request__id_destination_persistent"
                        ),
                    )
                ).values("id")[:1]
            )
        )
        only_with_recent_value_destination = (
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
        return only_with_recent_value_destination
