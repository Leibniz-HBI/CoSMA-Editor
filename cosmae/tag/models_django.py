"Database Models for Tags"
from datetime import datetime
from typing import List, Optional, Union

from django.db import models
from django.db.models.aggregates import Max

from cosmae.entity.models_django import Entity
from cosmae.exception import (
    DbObjectExistsException,
    EntityMissingException,
    InvalidTagValueException,
    NoParentTagException,
    TagDefinitionExistsException,
    TagDefinitionMissingException,
    TagInstanceExistsException,
)
from cosmae.util import CosmaeUser
from cosmae.util.django import change_or_create_versioned


class TagDefinition(models.Model):
    "Django ORM model for tag definitions."
    INNER = "INR"
    FLOAT = "FLT"
    STRING = "STR"
    TYPE_CHOICES = [(INNER, "inner"), (FLOAT, "float"), (STRING, "string")]
    name = models.TextField()
    id_persistent = models.TextField()
    id_parent_persistent = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES, default=INNER)
    time_edit = models.DateTimeField()
    previous_version = models.ForeignKey(
        "self", blank=True, null=True, on_delete=models.CASCADE, unique=True
    )
    owner = models.ForeignKey(
        "CosmaeUser", null=True, blank=True, on_delete=models.SET_NULL
    )
    curated = models.BooleanField(default=False)

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            "-previous_version"
        )[0]

    @classmethod
    def most_recent_children(cls, id_persistent: Optional[str]):
        "Ge the most recent versions of child tags."
        objects = TagDefinition.objects.filter(  # pylint: disable=no-member
            id_parent_persistent=id_persistent
        )
        return list(
            objects.filter(
                id=models.Subquery(
                    objects.filter(id_persistent=models.OuterRef("id_persistent"))
                    .values("id_persistent")
                    .annotate(max_id=Max("id"))
                    .values("max_id")
                )
            )
        )

    @classmethod
    def change_or_create(  # pylint: disable=too-many-arguments
        cls,
        id_persistent: str,
        time_edit: datetime,
        name: str,
        id_parent_persistent: Optional[str] = None,
        version: Optional[int] = None,
        owner: Optional[CosmaeUser] = None,
        **kwargs,
    ):
        """Changes a tag definition in the database by adding a new version.
        Note:
            The resulting object is not saved.
        Returns:
            The new object
            and a flag indicating wether the object changed from the most recent version.
        """
        if id_parent_persistent is not None:
            try:
                TagDefinition.most_recent_by_id(id_parent_persistent)
            except IndexError as exc:
                raise NoParentTagException(id_parent_persistent) from exc
        if version is None:
            exists = TagDefinition.objects.filter(  # pylint: disable=no-member
                name=name, id_parent_persistent=id_parent_persistent
            ).exclude(id_persistent=id_persistent)
            if exists:
                raise TagDefinitionExistsException(
                    name,
                    exists.order_by("-previous_version")[0].id_persistent,
                    id_parent_persistent,
                )
        try:
            return change_or_create_versioned(
                cls,
                id_persistent,
                version,
                name=name,
                time_edit=time_edit,
                id_parent_persistent=id_parent_persistent,
                owner=owner,
                **kwargs,
            )
        except DbObjectExistsException as exc:
            raise DbObjectExistsException(name) from exc

    def check_different_before_save(self, other):
        """Checks structural equality for two tag definitions.
        Note:
            * The version fields are not comapred as this check is intended to
               prevent unnecessary writes.
            * The time_edit fields are not compared as the operation is invalid."""
        if other.name != self.name:
            return True
        if other.id_parent_persistent != self.id_parent_persistent:
            return True
        if other.type != self.type:
            return True
        return False

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
    def for_user(cls, user: CosmaeUser):
        "Get all tag definitions for a user."
        objects = cls.objects.filter(owner=user)  # pylint: disable=no-member
        return objects.filter(
            id=models.Subquery(
                objects.filter(id_persistent=models.OuterRef("id_persistent"))
                .values("id_persistent")
                .annotate(max_id=Max("id"))
                .values("max_id")
            )
        )


class TagInstance(models.Model):
    "Django ORM model for tag instances."
    id_persistent = models.TextField()
    id_entity_persistent = models.TextField()
    id_tag_definition_persistent = models.TextField()
    value = models.TextField(null=True, blank=True)
    time_edit = models.DateTimeField()
    previous_version = models.ForeignKey(
        "self", blank=True, null=True, on_delete=models.CASCADE, unique=True
    )

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a tag_instance."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            "-previous_version"
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

    @classmethod
    def for_entities(
        cls, id_tag_definition_persistent: str, id_entity_persistent_list: List[str]
    ):
        "Get most recent values for a tag definition, limited by a list of entities."
        query_set = cls.objects.filter(  # pylint: disable=no-member
            id_entity_persistent__in=id_entity_persistent_list,
            id_tag_definition_persistent=id_tag_definition_persistent,
        )
        return cls.most_recent_queryset(query_set)

    @classmethod
    def change_or_create(  # pylint: disable=too-many-arguments
        cls,
        id_persistent: str,
        time_edit: datetime,
        id_entity_persistent: str,
        id_tag_definition_persistent: str,
        value: Optional[Union[int, float, List[str]]] = None,
        version: Optional[int] = None,
        **kwargs,
    ):
        """Changes an tag assignment by adding a new version.
        Note:
            The resulting object is not saved.
        Returns:
            The new object
            and a flag indicating wether the object changed from the most recent version.
        """
        try:
            Entity.most_recent_by_id(id_entity_persistent)
        except IndexError as exc:
            raise EntityMissingException(id_entity_persistent) from exc
        try:
            tag_def = TagDefinition.most_recent_by_id(id_tag_definition_persistent)
            value = tag_def.check_value(value)
        except IndexError as exc:
            raise TagDefinitionMissingException(id_tag_definition_persistent) from exc

        try:
            return change_or_create_versioned(
                cls,
                id_persistent,
                version,
                id_entity_persistent=id_entity_persistent,
                id_tag_definition_persistent=id_tag_definition_persistent,
                value=value,
                time_edit=time_edit,
                **kwargs,
            )
        except DbObjectExistsException as exc:
            raise TagInstanceExistsException(
                id_entity_persistent, id_tag_definition_persistent, value
            ) from exc

    @classmethod
    def by_tag_chunked(cls, id_tag_definition_persistent, offset, limit, manager=None):
        "Get tag instances for a tag_id in chunks."
        # TODO(@mo-fu) There is no proper chunking yet.
        # The results are not grouped by entity!
        # Fine for now as we always get the whole column/tag.
        try:
            tag = TagDefinition.most_recent_by_id(id_tag_definition_persistent)
        except IndexError as exc:
            raise TagDefinitionMissingException(id_tag_definition_persistent) from exc
        if tag.type == TagDefinition.INNER:
            tags = set(TagDefinition.most_recent_children(tag.id_persistent))
            tags.add(tag)
        else:
            tags = {tag}
        tag_ids = {tag.id_persistent for tag in tags}
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        objects = manager.filter(  # pylint: disable=no-member
            id_tag_definition_persistent__in=tag_ids
        )
        return list(
            objects.filter(
                id=models.Subquery(
                    objects.filter(id_persistent=models.OuterRef("id_persistent"))
                    .values("id_persistent")
                    .annotate(max_id=Max("id"))
                    .values("max_id")
                )
            )
        )[offset : offset + limit]

    @classmethod
    def most_recents_by_entity_and_definition_ids(
        cls, id_entity_persistent: str, id_tag_definition_persistent: str
    ):
        """Get all most recent values that match a given id_entity_persistent
        and id_entity_persistent."""
        matching = cls.objects.filter(  # pylint: disable=no-member
            id_entity_persistent=id_entity_persistent,
            id_tag_definition_persistent=id_tag_definition_persistent,
        )
        return list(
            matching.filter(
                id=models.Subquery(
                    matching.filter(id_persistent=models.OuterRef("id_persistent"))
                    .values("id_persistent")
                    .annotate(max_id=Max("id"))
                    .values("max_id")
                )
            )
        )

    def check_different_before_save(self, other):
        """Checks structural equality for two tag definitions.
        Note:
            * The version fields are not comapred as this check is intended to
               prevent unnecessary writes.
            * The time_edit fields are not compared as the operation is invalid."""
        if other.id_entity_persistent != self.id_entity_persistent:
            return True
        if other.id_tag_definition_persistent != self.id_tag_definition_persistent:
            return True
        if other.value != self.value:
            return True
        return False
