"Models for entity merge requests."

from __future__ import annotations

from typing import Optional

from django.db import models

from cosmae.entity.models_django import Entity, EntityHistory
from cosmae.exception import ForbiddenException
from cosmae.tag.models_django import (
    TagDefinition,
    TagDefinitionHistory,
    TagInstance,
    TagInstanceHistory,
)
from cosmae.util import CosmaeUser


class AbstractMergeRequest(models.Model):
    "Abstract Django model for a base merge request."

    OPEN = "OPN"
    CONFLICTS = "CNF"
    CLOSED = "CLS"
    RESOLVED = "RSL"
    MERGED = "MRG"
    ERROR = "ERR"
    STATE_CHOICES = [
        (OPEN, "open"),
        (CONFLICTS, "conflicts"),
        (CLOSED, "closed"),
        (RESOLVED, "resolved"),
        (MERGED, "merged"),
        (ERROR, "error"),
    ]
    id_destination_persistent = models.TextField()
    id_origin_persistent = models.TextField()
    created_by = models.ForeignKey(
        "CosmaeUser", related_name="+", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField()
    id_persistent = models.UUIDField(primary_key=True)
    state = models.TextField(max_length=3, choices=STATE_CHOICES, default=OPEN)

    class Meta:
        "Meta class for abstract merge request django model"

        # pylint: disable=too-few-public-methods
        abstract = True

    @classmethod
    def created_by_user(cls, user: CosmaeUser):
        "Get all merge requests created by a user"
        return cls.objects.filter(  # pylint: disable=no-member
            created_by=user,
            state__in=[
                cls.OPEN,
                cls.CONFLICTS,
                cls.ERROR,
            ],
        )

    @classmethod
    def by_id_persistent(cls, id_persistent: str, user: CosmaeUser):
        "Get a merge request by id_persistent"
        merge_request = cls.by_id_persistent_query_set(id_persistent).get()
        if merge_request.has_read_access(user):
            return merge_request
        raise ForbiddenException("merge request", merge_request.id_persistent)

    @classmethod
    def by_id_persistent_query_set(cls, id_persistent: str):
        "Query set containing the the merge request referenced by the id give as argument."
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )


class AbstractConflictResolution(models.Model):
    "Django ORM model for resolutions to merge request conflicts."

    # do not use persistent ids in order to allow change detection.
    tag_instance_destination = models.ForeignKey(
        TagInstanceHistory,
        on_delete=models.CASCADE,
        related_name="+",
        null=True,
        blank=True,
    )
    tag_instance_origin = models.ForeignKey(
        TagInstanceHistory,
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

    instance_non_recent_predicate = (
        (
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

    @classmethod
    def annotate_instance_origin_most_recent(cls, queryset, **additional_annotations):
        "Annotate a conflict with the most recent instances"
        return queryset.annotate(
            tag_instance_origin_most_recent=models.Subquery(
                TagInstance.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("tag_instance_origin__id_persistent")
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


class EntityMergeRequest(AbstractMergeRequest):
    "Django model for entity merge requests."

    @classmethod
    def get_existing_query_set(
        cls, id_entity_origin_persistent, id_entity_destination_persistent
    ):
        """Get the query set of existing entity merge requests
        with same origin and and destination ids."""
        return cls.objects.filter(  # pylint: disable=no-member
            id_origin_persistent=id_entity_origin_persistent,
            id_destination_persistent=id_entity_destination_persistent,
        )

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
            tag_instance_origin=models.F("tag_instance_destination"),
            tag_instance_destination=models.F("tag_instance_origin"),
        )
        self.save()

    @classmethod
    def get_by_id_persistent(cls, id_persistent):
        "Get an entity merge request by its id_persistent."
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        ).get()

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
            TagInstance.objects_all()
            .annotate(
                tag_definition_disabled=models.Subquery(
                    TagDefinition.objects_all(include_disabled=True)
                    .filter(
                        id_persistent=models.OuterRef("id_tag_definition_persistent")
                    )
                    .values("disabled")
                )
            )
            .filter(
                id_entity_persistent=self.id_origin_persistent,
                tag_definition_disabled=False,
            )
        )
        if len(instance_origin_recent_query) == 0:
            return instance_origin_recent_query

        instance_destination_recent_query = TagInstance.objects_all().filter(
            id_entity_persistent=self.id_destination_persistent
        )
        conflicts_sub_query = instance_destination_recent_query.filter(
            id_tag_definition_persistent=models.OuterRef("id_tag_definition_persistent")
        )

        if resolution_values is None:
            resolution_values = (
                EntityConflictResolution.objects.none()  # pylint: disable=no-member
            )
        resolutions_sub_query = resolution_values.filter(
            entity_origin__id_persistent=models.OuterRef("id_entity_persistent"),
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
            conflict_resolution_replacement_state=models.Subquery(
                resolutions_sub_query.values("replacement_state")
            ),
            conflict_resolution_replacement_value=models.Subquery(
                resolutions_sub_query.values("replacement_value")
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

        return with_conflict_info.exclude(
            conflict_resolution_replacement_state__isnull=False
        )

    def resolvable_unresolvable_updated(
        self: EntityMergeRequest,
        tag_definition_query_set: models.BaseManager[TagDefinition],
    ):
        "Get conflicts for a merge request"
        resolutions = EntityConflictResolution.for_merge_request_query_set(self)
        recent = EntityConflictResolution.only_recent(resolutions)
        updated_query_set = EntityConflictResolution.non_recent(resolutions)
        conflict_query_set = TagInstance.annotate_tag_definition(
            self.instance_conflicts_all(True, recent)
        )
        with_user_tag_def_id = conflict_query_set.annotate(
            id_tag_definition_most_recent_persistent=models.fields.json.KT(
                "tag_definition__id_persistent"
            )
        ).annotate(
            writable_tag_def_id=models.Subquery(
                tag_definition_query_set.filter(
                    id_persistent=models.OuterRef(
                        "id_tag_definition_most_recent_persistent"
                    )
                ).values("id")[:1]
            )
        )
        resolvable_conflicts = with_user_tag_def_id.filter(
            writable_tag_def_id__isnull=False
        )
        unresolvable_conflicts = with_user_tag_def_id.filter(
            writable_tag_def_id__isnull=True
        )
        # need to filter updated for resolvable
        updated_resolvable = (
            updated_query_set.annotate(
                id_tag_definition_most_recent=models.functions.Cast(
                    "tag_definition_most_recent__id", models.BigIntegerField()
                )
            )
            .annotate(
                writable_tag_def_id=models.Subquery(
                    tag_definition_query_set.filter(
                        id=models.OuterRef("id_tag_definition_most_recent")
                    ).values("id")[:1]
                )
            )
            .filter(writable_tag_def_id__isnull=False)
        )
        return resolvable_conflicts, unresolvable_conflicts, updated_resolvable


class EntityConflictResolution(AbstractConflictResolution):
    "Django model for entity conflict resolutions."

    merge_request = models.ForeignKey(EntityMergeRequest, on_delete=models.CASCADE)
    entity_origin = models.ForeignKey(
        EntityHistory, on_delete=models.CASCADE, related_name="+"
    )
    entity_destination = models.ForeignKey(
        EntityHistory, on_delete=models.CASCADE, related_name="+"
    )
    tag_definition = models.ForeignKey(
        TagDefinitionHistory, on_delete=models.CASCADE, related_name="+"
    )

    @classmethod
    def for_merge_request_query_set(cls, merge_request: EntityMergeRequest):
        "Get resolutions for a merge request."
        return cls.objects.filter(  # pylint: disable=no-member
            merge_request=merge_request
        ).filter(tag_instance_origin__isnull=False)

    @classmethod
    def non_recent(cls, manager=None):
        """Get the conflict resolutions that reference not up to date entities,
        tag definition or tag instances."""
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        with_version_info = cls.annotate_instance_origin_most_recent(
            manager,
            tag_definition_most_recent=models.Subquery(
                TagDefinition.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("tag_definition__id_persistent"),
                    disabled=False,
                ).values(
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
                )[
                    :1
                ]
            ),
            entity_origin_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("entity_origin__id_persistent")
                ).values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        display_txt="display_txt",
                    )
                )[
                    :1
                ]
            ),
            entity_destination_most_recent=models.Subquery(
                Entity.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("entity_destination__id_persistent")
                ).values(
                    json=models.functions.JSONObject(
                        id="id",
                        id_persistent="id_persistent",
                        display_txt="display_txt",
                    )
                )[
                    :1
                ]
            ),
            tag_instance_destination_most_recent=models.Subquery(
                TagInstance.objects.filter(  # pylint: disable=no-member
                    models.Q(
                        id_persistent=models.OuterRef(
                            "tag_instance_destination__id_persistent"
                        )
                    )
                    | models.Q(
                        # case when tag_instance destination is null
                        # therefore use entity information
                        # and tag_definition information from merge request!
                        id_entity_persistent=models.OuterRef(
                            "merge_request__id_destination_persistent"
                        ),
                        id_tag_definition_persistent=models.OuterRef(
                            "tag_definition__id_persistent"
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
                tag_definition__id=models.functions.Cast(
                    models.F("tag_definition_most_recent__id"), models.BigIntegerField()
                )
            )
            | ~models.Q(
                entity_origin__id=models.functions.Cast(
                    models.F("entity_origin_most_recent__id"),
                    models.BigIntegerField(),
                ),
            )
            | ~models.Q(
                entity_destination__id=models.functions.Cast(
                    models.F("entity_destination_most_recent__id"),
                    models.BigIntegerField(),
                ),
            )
            | cls.instance_non_recent_predicate
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
        with_tag_definition_version_info = manager.annotate(
            id_tag_definition_most_recent=TagDefinition.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("tag_definition__id_persistent")
            ).values(
                "id"
            )[
                :1
            ]
        )
        only_with_recent_tag_definitions = with_tag_definition_version_info.filter(
            tag_definition__id=models.F("id_tag_definition_most_recent")
        )
        with_entity_origin_version_info = only_with_recent_tag_definitions.annotate(
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
            id_tag_instance_origin_most_recent=TagInstance.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("tag_instance_origin__id_persistent")
            ).values(
                "id"
            )[
                :1
            ]
        )
        only_with_recent_instance_origin = with_instance_origin_version_info.filter(
            tag_instance_origin__id=models.F("id_tag_instance_origin_most_recent")
        )
        with_instance_destination_version_info = only_with_recent_instance_origin.annotate(
            id_tag_instance_destination_most_recent=models.Subquery(
                TagInstance.objects.filter(  # pylint: disable=no-member
                    models.Q(
                        id_persistent=models.OuterRef(
                            "tag_instance_destination__id_persistent"
                        )
                    )
                    | models.Q(
                        # case when tag_instance destination is null
                        # therefore use entity information
                        # and tag_definition information from merge request!
                        id_tag_definition_persistent=models.OuterRef(
                            "tag_definition__id_persistent"
                        ),
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
