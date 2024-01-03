"Django models for merge requests."
from __future__ import annotations

from typing import Optional

from django.db import models

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity
from cosmae.merge_request.entity.models_django import (
    AbstractConflictResolution,
    AbstractMergeRequest,
)
from cosmae.tag.models_django import TagDefinition, TagInstanceHistory
from cosmae.util import CosmaeUser
from cosmae.util.django import get_json_array_agg


class TagMergeRequest(AbstractMergeRequest):
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

    @classmethod
    def assigned_to_user(cls, user: CosmaeUser):
        "Get all merge requests assigned to a user"
        return TagMergeRequest.objects.filter(  # pylint: disable=no-member
            assigned_to=user,
            state__in=[
                TagMergeRequest.OPEN,
                TagMergeRequest.CONFLICTS,
                TagMergeRequest.ERROR,
            ],
        )

    def has_read_access(self, user: CosmaeUser):
        "Check wether a user can read the merge request."
        return (
            # pylint:disable-next=consider-using-in
            self.created_by == user
            or self.assigned_to == user
        )

    @classmethod
    def get_tag_definitions_for_entities_request(
        cls,
        id_tag_definition_persistent: str,
        id_contribution_persistent: Optional[str],
        id_merge_request_persistent: Optional[str],
        user: CosmaeUser,
    ):
        """Get the tag definitions relevant for an entities focused tag_instance request.
        returns:
        A set of tuples. The first element is the id of the tag definition.
        The second element indicates whether this is existing data."""
        if id_contribution_persistent is None:
            if id_merge_request_persistent is None:
                return {(id_tag_definition_persistent, True)}
            merge_request = TagMergeRequest.by_id_persistent(
                id_merge_request_persistent, user
            )
            if merge_request.contribution_candidate:
                contribution = merge_request.contribution_candidate
            elif (
                # pylint:disable-next=consider-using-in
                merge_request.id_destination_persistent == id_tag_definition_persistent
                or merge_request.id_origin_persistent == id_tag_definition_persistent
            ):
                return {
                    (merge_request.id_destination_persistent, True),
                    (merge_request.id_origin_persistent, False),
                }
        else:
            contribution = ContributionCandidate.by_id_persistent(
                id_contribution_persistent, user
            ).get()
        merge_requests_manager = contribution.tagmergerequest_set
        for merge_request in merge_requests_manager.iterator():
            if (
                # pylint:disable-next=consider-using-in
                merge_request.id_origin_persistent == id_tag_definition_persistent
                or merge_request.id_destination_persistent
                == id_tag_definition_persistent
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
        return {(id_tag_definition_persistent, True)}

    def instance_conflicts_all(
        self,
        include_resolved: bool = False,
        resolution_values: Optional[models.BaseManager[TagConflictResolution]] = None,
    ):
        """Get conflicts to merging the origin tag referenced by the merge request
        into the destination tag"""
        instance_origin_recent_query = TagInstanceHistory.most_recent_queryset().filter(
            id_tag_definition_persistent=self.id_origin_persistent
        )

        if len(instance_origin_recent_query) == 0:
            return instance_origin_recent_query

        instance_destination_recent_query = (
            TagInstanceHistory.most_recent_queryset().filter(
                id_tag_definition_persistent=self.id_destination_persistent
            )
        )
        conflicts_sub_query = instance_destination_recent_query.filter(
            id_entity_persistent=models.OuterRef("id_entity_persistent")
        )

        if resolution_values is None:
            resolution_values = (
                TagConflictResolution.objects.none()  # pylint: disable=no-member
            )
        resolutions_sub_query = resolution_values.filter(
            tag_definition_origin__id_persistent=models.OuterRef(
                "id_tag_definition_persistent"
            ),
            tag_instance_origin__id_persistent=models.OuterRef("id_persistent"),
        )
        conflict_candidate_query = instance_origin_recent_query.annotate(
            tag_instance_destination=models.Subquery(
                conflicts_sub_query.values(
                    json=models.functions.JSONObject(
                        id="id", id_persistent="id_persistent", value="value"
                    )
                )
            ),
            conflict_resolution_replace=models.Subquery(
                resolutions_sub_query.values("replace")
            ),
        )
        with_conflict_info = conflict_candidate_query.exclude(
            models.Q(
                tag_instance_destination__isnull=False,
                value=models.fields.json.KT("tag_instance_destination__value"),
            )
        )
        if include_resolved:
            return with_conflict_info

        return with_conflict_info.exclude(conflict_resolution_replace__isnull=False)

    @classmethod
    def contribution_with_match_tag_definitions(cls, id_contribution_persistent):
        "Gets the tag definitions that were used for matching in a specific contribution."
        return ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=id_contribution_persistent
        ).annotate(
            matched_tag_definitions=models.Subquery(
                TagMergeRequest.objects.filter(  # pylint: disable=no-member
                    contribution_candidate_id=models.OuterRef("id_persistent")
                )
                .annotate(
                    tag_def_json=models.Subquery(
                        TagDefinition.most_recent_query_set()
                        .filter(
                            curated=True,
                            id_persistent=models.OuterRef("id_destination_persistent"),
                        )
                        .values(
                            tag_def_json=models.functions.JSONObject(
                                id="id",
                                id_persistent="id_persistent",
                                id_parent_persistent="id_parent_persistent",
                                name="name",
                                type="type",
                                curated="curated",
                                owner="owner",
                                hidden="hidden",
                            )
                        )
                        .filter(tag_def_json__isnull=False)
                    )
                )
                .values("contribution_candidate_id")
                .annotate(
                    json_tag_def_list=get_json_array_agg()("tag_def_json", default=[])
                )
                .values("json_tag_def_list")
            )
        )


class TagConflictResolution(AbstractConflictResolution):
    "Django ORM model for resolutions to merge request conflicts."

    # do not use persistent ids in order to allow change detection.
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="+")
    tag_definition_destination = models.ForeignKey(
        TagDefinition, on_delete=models.CASCADE, related_name="+"
    )
    tag_definition_origin = models.ForeignKey(
        TagDefinition, on_delete=models.CASCADE, related_name="+"
    )
    merge_request = models.ForeignKey(TagMergeRequest, on_delete=models.CASCADE)
    replace = models.BooleanField()

    @classmethod
    def for_merge_request_query_set(cls, merge_request: TagMergeRequest):
        "Get resolutions for a merge request."
        return cls.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request
        )

    @classmethod
    def non_recent(cls, manager=None):
        """Get the conflict resolutions that reference not up to date entities,
        tag definition or tag instances."""
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        with_version_info = manager.annotate(
            entity_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("entity__id_persistent")
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
                .values(  # pylint: disable=duplicate-code
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        display_txt="display_txt",
                        disabled="disabled",
                    )
                )[:1]
            ),
            tag_definition_origin_most_recent=models.Subquery(
                TagDefinition.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef(
                        "tag_definition_origin__id_persistent"
                    )
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
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
            tag_definition_destination_most_recent=models.Subquery(
                TagDefinition.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef(
                        "tag_definition_destination__id_persistent"
                    )
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
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
            tag_instance_origin_most_recent=models.Subquery(
                TagInstanceHistory.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("tag_instance_origin__id_persistent")
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
                .values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        value="value",
                    )
                )[:1]
            ),
            tag_instance_destination_most_recent=models.Subquery(
                TagInstanceHistory.objects.filter(  # pylint: disable=no-member
                    models.Q(
                        id_persistent=models.OuterRef(
                            "tag_instance_destination__id_persistent"
                        )
                    )
                    | models.Q(
                        # case when tag_instance destination is null
                        # therefore use entity information
                        # and tag_definition information from merge request!
                        id_entity_persistent=models.OuterRef("entity__id_persistent"),
                        id_tag_definition_persistent=models.OuterRef(
                            "merge_request__id_destination_persistent"
                        ),
                    )
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
                .values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        value="value",
                    )
                )[:1]
            ),
        )
        non_recent_query_set = with_version_info.filter(
            ~models.Q(
                entity__id=models.functions.Cast(
                    models.F("entity_most_recent__id"), models.BigIntegerField()
                )
            )
            | ~models.Q(
                tag_definition_origin__id=models.functions.Cast(
                    models.F("tag_definition_origin_most_recent__id"),
                    models.BigIntegerField(),
                ),
            )
            | ~models.Q(
                tag_definition_destination__id=models.functions.Cast(
                    models.F("tag_definition_destination_most_recent__id"),
                    models.BigIntegerField(),
                ),
            )
            | (
                models.Q(tag_instance_destination__isnull=False)
                & ~models.Q(
                    tag_instance_destination__id=models.functions.Cast(
                        models.F("tag_instance_destination_most_recent__id"),
                        models.BigIntegerField(),
                    ),
                )
            )
            | models.Q(
                tag_instance_destination__isnull=True,
                tag_instance_destination_most_recent__isnull=False,
            )
            | ~models.Q(
                tag_instance_origin__id=models.functions.Cast(
                    models.F("tag_instance_origin_most_recent__id"),
                    models.BigIntegerField(),
                )
            )
        )
        return non_recent_query_set.exclude(
            tag_instance_origin_most_recent__value=models.F(
                "tag_instance_destination_most_recent__value"
            )
        )

    @classmethod
    def only_recent(cls, manager=None):
        """Get the conflict resolutions that reference not up to date entities,
        tag definition or tag instances."""
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        with_entity_version_info = manager.annotate(
            id_entity_most_recent=Entity.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("entity__id_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))
            .values("id")[:1]
        )
        only_with_recent_entities = with_entity_version_info.filter(
            entity__id=models.F("id_entity_most_recent")
        )
        with_tag_def_origin_version_info = only_with_recent_entities.annotate(
            id_tag_definition_origin_most_recent=TagDefinition.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("tag_definition_origin__id_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))
            .values("id")[:1]
        )
        only_with_recent_tag_def_origins = with_tag_def_origin_version_info.filter(
            tag_definition_origin__id=models.F("id_tag_definition_origin_most_recent")
        )
        with_tag_def_destination_version_info = only_with_recent_tag_def_origins.annotate(
            id_tag_definition_destination_most_recent=TagDefinition.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef(
                    "tag_definition_destination__id_persistent"
                )
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))
            .values("id")[:1]
        )
        only_with_recent_tag_def_destinations = (
            with_tag_def_destination_version_info.filter(
                tag_definition_destination__id=models.F(
                    "id_tag_definition_destination_most_recent"
                )
            )
        )
        with_instance_origin_version_info = only_with_recent_tag_def_destinations.annotate(
            id_tag_instance_origin_most_recent=TagInstanceHistory.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("tag_instance_origin__id_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))
            .values("id")[:1]
        )
        only_with_recent_instance_origin = with_instance_origin_version_info.filter(
            tag_instance_origin__id=models.F("id_tag_instance_origin_most_recent")
        )
        with_instance_destination_version_info = only_with_recent_instance_origin.annotate(
            id_tag_instance_destination_most_recent=models.Subquery(
                TagInstanceHistory.objects.filter(  # pylint: disable=no-member
                    models.Q(
                        id_persistent=models.OuterRef(
                            "tag_instance_destination__id_persistent"
                        )
                    )
                    | models.Q(
                        # case when tag_instance destination is null
                        # therefore use entity information
                        # and tag_definition information from merge request!
                        id_entity_persistent=models.OuterRef("entity__id_persistent"),
                        id_tag_definition_persistent=models.OuterRef(
                            "merge_request__id_destination_persistent"
                        ),
                    )
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
                .values("id")[:1]
            )
        )
        only_with_recent_instance_destination = (
            with_instance_destination_version_info.filter(
                models.Q(
                    id_tag_instance_destination_most_recent__isnull=False,
                    tag_instance_destination__id=models.F(
                        "id_tag_instance_destination_most_recent"
                    ),
                )
                | models.Q(
                    tag_instance_destination__isnull=True,
                    id_tag_instance_destination_most_recent__isnull=True,
                )
            )
        )
        return only_with_recent_instance_destination
