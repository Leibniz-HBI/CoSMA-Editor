"Database Models for Tags"

from __future__ import annotations

from typing import List, Optional, Type, TypeVar

from django.db import models
from django.db.models.aggregates import Max

from cosmae.entity.models_django import Entity
from cosmae.exception import (
    EntityMissingException,
    ForbiddenException,
    InvalidTagValueException,
    NoParentTagException,
    NoSelfParentTagException,
    TagDefinitionDisabledException,
    TagDefinitionExistsException,
    TagDefinitionMissingException,
)
from cosmae.util import CosmaeUser
from cosmae.versioned.models_django import HistoryMixin, Versioned


class TagDefinitionAbstract(Versioned):
    "Abstract Django ORM model for tag definitions."

    INNER = "INR"
    FLOAT = "FLT"
    STRING = "STR"
    TYPE_CHOICES = [(INNER, "inner"), (FLOAT, "float"), (STRING, "string")]
    name = models.TextField()
    description = models.TextField(blank=True, null=True)
    id_parent_persistent = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES, default=INNER)
    time_edit = models.DateTimeField()
    owner = models.ForeignKey(
        "CosmaeUser", null=True, blank=True, on_delete=models.SET_NULL
    )
    curated = models.BooleanField(default=False)

    class Meta:
        "Meta class for abstract tag definition django model"

        # pylint: disable=too-few-public-methods
        abstract = True

    def is_owner(self, user_id_persistent: str):
        "Check wether a user owns the tag definition."
        return (  # pylint: disable=no-member
            self.owner is None
            and CosmaeUser.objects.filter(id_persistent=user_id_persistent)
            .get()
            .permission_group
            in {CosmaeUser.COMMISSIONER, CosmaeUser.EDITOR}
        ) or (
            self.owner is not None
            and str(self.owner.id_persistent) == user_id_persistent
        )

    def has_write_access(self, user_id_persistent: str):
        "Check wether a user can write to the tag definition."
        return self.is_owner(user_id_persistent)


class TagDefinitionHistory(TagDefinitionAbstract, HistoryMixin):
    "Django ORM model for tag definitions history."

    unmodifiable_fields = {"id_persistent", "type"}

    @classmethod
    def most_recent_query_set(
        cls, manager=None, include_hidden=False, include_disabled=False
    ):
        "Get a query set containing all most recent tag definitions."
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        most_recent = manager.annotate(
            id_most_recent=models.Subquery(
                cls.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("id_persistent")
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
                .values("id")[:1]
            )
        ).filter(id=models.F("id_most_recent"))
        if not include_hidden:
            most_recent = most_recent.filter(hidden=False)
        if not include_disabled:
            most_recent.filter(disabled=False)
        return most_recent

    @classmethod
    def most_recent_by_id_query_set(cls, id_persistent):
        """Return a query for the most recent version of a tag definition."""
        return cls.most_recent_query_set().filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a tag definition."""
        return cls.most_recent_by_id_query_set(id_persistent).get()

    def set_curated(self, requester: CosmaeUser, time_edit):
        "Set curated state for a tag definition."
        return TagDefinitionHistory.change_or_create_versioned(
            self.id_persistent,
            time_edit,
            requester.edit_session,
            requester.id_persistent,
            version=self.id,  # pylint: disable=no-member
            name=self.name,
            id_parent_persistent=self.id_parent_persistent,
            owner_id=None,
            curated=True,
            skip_write_check=True,
        )

    def set_owner(self, user: CosmaeUser, requester: CosmaeUser, time_edit):
        "Set curated state for a tag definition."
        return TagDefinitionHistory.change_or_create_versioned(
            self.id_persistent,
            time_edit,
            written_by_session=requester.edit_session,
            owner_id=user.id,
            name=self.name,
            id_parent_persistent=self.id_parent_persistent,
            version=self.id,  # pylint: disable=no-member
            curated=False,
        )

    def check_integrity(self):  # pylint: disable=too-many-arguments
        """Check wether new version keeps constraints."""
        if self.id_parent_persistent is not None:
            if self.id_parent_persistent == self.id_persistent:
                raise NoSelfParentTagException()
            try:
                TagDefinition.most_recent_by_id(self.id_parent_persistent)
            except TagDefinition.DoesNotExist as exc:  # pylint: disable=no-member
                raise NoParentTagException(self.id_parent_persistent) from exc
        if self.previous_version is None:
            exists = (
                TagDefinition.objects.filter(  # pylint: disable=no-member
                    name=self.name, id_parent_persistent=self.id_parent_persistent
                )
                # annotate successor in history
                .annotate(
                    next_version=models.Subquery(
                        TagDefinition.objects.filter(  # pylint: disable=no-member
                            previous_version=models.OuterRef("id")
                        ).values("id")
                    )
                )
                # exclude when same id_persistent and no successor present
                .exclude(id_persistent=self.id_persistent, next_version__isnull=True)
            )
            if exists:
                raise TagDefinitionExistsException(
                    self.name,
                    exists.order_by(models.F("previous_version").desc(nulls_last=True))[
                        0
                    ].id_persistent,
                    self.id_parent_persistent,
                )

    def check_different_before_save(self, other):
        """Checks structural equality for two tag definitions."""
        return (
            other.name != self.name
            or other.id_parent_persistent != self.id_parent_persistent
            or other.type != self.type
            or other.owner != self.owner
            or other.curated != self.curated
            or other.description != self.description
        )


_T = TypeVar("_T")


class TagDefinition(TagDefinitionAbstract):
    "Django ORM model for tag definitions."

    class Meta:
        "Meta class for tag definition view to ensure django does not create a table."

        # pylint: disable=too-few-public-methods
        managed = False

    @classmethod
    def query_set(cls, manager=None, include_hidden=False):
        "Get a query set containing all most recent tag definitions."
        if manager is None:
            manager = cls.objects.all()  # pylint: disable=no-member
        if include_hidden:
            return manager
        return manager.filter(hidden=False)

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a tag definition."""
        return cls.most_recent_by_id_query_set(id_persistent).get()

    @classmethod
    def most_recent_by_id_query_set(cls, id_persistent):
        """Return a query for the most recent version of a tag definition."""
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )

    @classmethod
    def children_query_set(
        cls, id_persistent: Optional[str], user: Optional[CosmaeUser] = None
    ):
        "Get the most recent versions of child tags."
        children = cls.objects.filter(  # pylint: disable=no-member
            id_parent_persistent=id_persistent, disabled=False
        )
        if user is None:
            return children.filter(hidden=False)
        return children.filter(models.Q(hidden=False) | models.Q(owner=user))

    def _get_history_entry(self):
        # pylint: disable=no-member
        return TagDefinitionHistory.objects.filter(id=self.id).get()

    def set_curated(self, requester: CosmaeUser, time_edit):
        "Set curated state for a tag definition."
        return self._get_history_entry().set_curated(requester, time_edit)

    def set_owner(self, user: CosmaeUser, requester: CosmaeUser, time_edit):
        "Set owner for a tag definition."
        return self._get_history_entry().set_owner(user, requester, time_edit)

    def check_value(self, val: str):
        "Check if a value is of the type for this tag."
        if self.type == TagDefinition.INNER and not (
            (isinstance(val, str) and val.lower() in {"true", "false"})
        ):
            raise InvalidTagValueException(self.id_persistent, val, self.type)
        if self.type == TagDefinition.STRING and val is None:
            raise InvalidTagValueException(self.id_persistent, val, self.type)
        if self.type == TagDefinition.FLOAT:
            try:
                _ = float(val)
            except ValueError as exc:
                raise InvalidTagValueException(
                    self.id_persistent, val, self.type
                ) from exc
        return val

    @classmethod
    def for_user(
        cls: Type[_T],
        user: CosmaeUser,
        include_curated: bool = False,
        include_disabled: bool = False,
    ) -> models.Manager[_T]:
        "Get all tag definitions for a user."
        if include_curated:
            if not user.permission_group in [
                CosmaeUser.EDITOR,
                CosmaeUser.COMMISSIONER,
            ]:
                raise ForbiddenException("Tag Definition", "")
            return cls.objects.filter(  # pylint: disable=no-member
                (models.Q(curated=True) | models.Q(owner=user))
                & models.Q(disabled=include_disabled)
            )
        return cls.objects.filter(  # pylint: disable=no-member
            owner=user, disabled=include_disabled
        )

    @classmethod
    def curated_query_set(cls):
        "Get most recent curated tag definition"
        return cls.objects.filter(curated=True)  # pylint: disable=no-member


class TagInstanceAbstract(Versioned):
    "Django ORM model for tag instances."

    id_entity_persistent = models.CharField(max_length=36)
    id_tag_definition_persistent = models.TextField()
    value = models.TextField(null=True, blank=True)
    merged_from = models.CharField(max_length=36, null=True)

    class Meta:
        "Meta class for abstract TagInstance django model"

        # pylint: disable=too-few-public-methods
        abstract = True

    def __eq__(self, other: object) -> bool:
        comparison = (
            isinstance(other, TagInstanceAbstract)
            and self.id == other.id  # pylint: disable=no-member
            and self.id_persistent == other.id_persistent
            and self.id_entity_persistent == other.id_entity_persistent
            and self.id_tag_definition_persistent == other.id_tag_definition_persistent
            and self.value == other.value
            and self.time_edit == other.time_edit
            and self.previous_version_id  # pylint: disable=no-member
            == other.previous_version_id
        )
        return comparison


class TagInstanceHistory(TagInstanceAbstract, HistoryMixin):
    "Provides access to tag instance history"

    unmodifiable_fields = {
        "id_persistent",
        "id_tag_definition_persistent",
    }

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a tag_instance."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            models.F("previous_version").desc(nulls_last=True)
        )[0]

    @classmethod
    def most_recent_queryset(cls, manager=None):
        "Return most recent versions of all_tag_instances"
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
            tag_def = TagDefinition.most_recent_by_id(self.id_tag_definition_persistent)
        except TagDefinition.DoesNotExist:  # pylint: disable=no-member
            return True
        return tag_def.has_write_access(id_user_persistent)

    def check_integrity(  # pylint: disable=too-many-arguments
        self,
    ):
        """Check wether the object conforms to implicit assumptions."""
        try:
            Entity.most_recent_by_id(self.id_entity_persistent)
        except Entity.DoesNotExist as exc:  # pylint: disable=no-member
            raise EntityMissingException(self.id_entity_persistent) from exc
        try:
            tag_def = TagDefinition.most_recent_by_id(self.id_tag_definition_persistent)
            if tag_def.disabled:
                raise TagDefinitionDisabledException(tag_def.id_persistent)
            tag_def.check_value(self.value)
        except TagDefinition.DoesNotExist as exc:  # pylint: disable=no-member
            raise TagDefinitionMissingException(
                self.id_tag_definition_persistent
            ) from exc

    def check_different_before_save(self, other):
        """Checks structural equality for two tag definitions."""
        return (
            other.id_entity_persistent != self.id_entity_persistent
            or other.id_tag_definition_persistent != self.id_tag_definition_persistent
            or other.value != self.value
            or other.merged_from != self.merged_from
        )


class TagInstance(TagInstanceAbstract):
    "Django ORM class for view representing the most recent tag instances."

    class Meta:
        "Meta class for TagInstance view to ensure django does not create a table."

        # pylint: disable=too-few-public-methods
        managed = False

    @classmethod
    def for_entities(
        cls, id_tag_definition_persistent: str, id_entity_persistent_list: List[str]
    ):
        "Get most recent values for a tag definition, limited by a list of entities."
        return cls.objects.filter(  # pylint: disable=no-member
            id_entity_persistent__in=id_entity_persistent_list,
            id_tag_definition_persistent=id_tag_definition_persistent,
        )

    @classmethod
    def get_by_id(cls, id_persistent):
        "Get a tag instance by its persistent id"
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        ).get()

    @classmethod
    def by_tag_chunked(cls, id_tag_definition_persistent, offset, limit, manager=None):
        "Get tag instances for a tag_id in chunks."
        try:
            tag = TagDefinition.most_recent_by_id(id_tag_definition_persistent)
        except TagDefinition.DoesNotExist as exc:  # pylint: disable=no-member
            raise TagDefinitionMissingException(id_tag_definition_persistent) from exc
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        return list(
            manager.filter(
                id_tag_definition_persistent=tag.id_persistent, id__gte=offset
            ).order_by("id")
        )[:limit]

    @classmethod
    def most_recent_by_entity_and_definition_id_query_set(
        cls, id_entity_persistent: str, id_tag_definition_persistent: str
    ):
        """Get all most recent values that match a given id_entity_persistent
        and id_entity_persistent."""
        return cls.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=id_entity_persistent,
            id_tag_definition_persistent=id_tag_definition_persistent,
        ).order_by("id")

    @classmethod
    def annotate_entity(cls, manager: Optional[models.BaseManager[TagInstance]]):
        "Annotate tag instances with the most recent entity and tag instance"
        if manager is None:
            manager = TagInstance.objects  # pylint: disable=no-member
        entity_sub_query = Entity.objects.filter(  # pylint: disable=no-member
            id_persistent=models.OuterRef("id_entity_persistent")
        ).order_by(models.F("previous_version").desc(nulls_last=True))[:1]
        return manager.annotate(
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

    @classmethod
    def annotate_tag_definition(
        cls, manager: Optional[models.BaseManager[TagInstance]]
    ):
        "Annotate tag instances with the most recent tag definition and tag instance"
        if manager is None:
            manager = TagInstance.objects  # pylint: disable=no-member
        tag_def_sub_query = TagDefinition.objects.filter(  # pylint: disable=no-member
            id_persistent=models.OuterRef("id_tag_definition_persistent")
        ).order_by(models.F("previous_version").desc(nulls_last=True))[:1]
        return manager.annotate(
            tag_definition=models.Subquery(
                # pylint: disable=duplicate-code
                tag_def_sub_query.values(
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


class OwnershipRequest(models.Model):
    "Django ORM Model for ownership change requests."

    id_persistent = models.UUIDField(unique=True)
    id_tag_definition_persistent = models.TextField()
    receiver = models.ForeignKey(
        "CosmaeUser", blank=True, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    petitioner = models.ForeignKey(
        "CosmaeUser", blank=True, null=True, on_delete=models.CASCADE, related_name="+"
    )

    @classmethod
    def by_id_tag_definition_persistent(cls, id_tag_definition_persistent: str):
        "Get an ownership request by tag definition"
        cls.by_id_tag_definition_persistent_query_set(
            id_tag_definition_persistent
        ).get()

    @classmethod
    def by_id_tag_definition_persistent_query_set(cls, id_tag_definition_persistent):
        "Get an ownership request by tag definition as a query set."
        return cls.objects.filter(  # pylint: disable = no-member
            id_tag_definition_persistent=id_tag_definition_persistent
        )

    @classmethod
    def by_id_persistent(cls, id_ownership_request_persistent):
        "Get an Ownership request by its persistent id."
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_ownership_request_persistent
        ).get()

    @classmethod
    def _annotate_tag_definitions(cls, manager):
        tag_definition_sub_query = (
            TagDefinition.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("id_tag_definition_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))[:1]
            .values(
                tag_definition=models.functions.JSONObject(
                    id="id",
                    name="name",
                    id_persistent="id_persistent",
                    id_parent_persistent="id_parent_persistent",
                    description="description",
                    time_edit="time_edit",
                    type="type",
                    previous_version="previous_version",
                    owner=models.functions.JSONObject(
                        username="owner__username",
                        id_persistent="owner__id_persistent",
                        permission_group="owner__permission_group",
                        id="owner__id",
                    ),
                    curated="curated",
                    hidden="hidden",
                    disabled="disabled",
                )
            )
        )
        return manager.annotate(tag_definition=tag_definition_sub_query)

    @classmethod
    def received_by_user_query_set(cls, user: CosmaeUser):
        "Get the ownership requests received by a user."
        return cls._annotate_tag_definitions(
            cls.objects.filter(receiver=user)  # pylint: disable=no-member
        )

    @classmethod
    def petitioned_by_user_query_set(cls, user: CosmaeUser):
        """Get the ownership requests petitioned by a user.
        If the user is a commissioner or an editor,
        curated tags will also be included."""
        petitioned_self = cls._annotate_tag_definitions(
            cls.objects.filter(petitioner=user)  # pylint: disable=no-member
        )
        if user.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}:
            petitioned_curated = cls._annotate_tag_definitions(
                cls.objects.all()  # pylint: disable=no-member
            ).filter(
                tag_definition__isnull=False,
                # JSONObject will make this an int.
                tag_definition__curated=True,
            )
            return petitioned_self.union(petitioned_curated)
        return petitioned_self
