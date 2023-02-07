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
    NoChildTagDefintionsAllowedException,
    NoParentTagException,
    TagDefinitionExistsException,
    TagDefinitionMissingException,
    TagInstanceExistsException,
)
from cosmae.util.django import change_or_create_versioned


class TagDefinition(models.Model):
    "Django ORM model for tag defintions."
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

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            "-previous_version"
        )[0]

    def most_recent_children(self):
        "Ge the most recent versions of child tags."
        objects = TagDefinition.objects.filter(  # pylint: disable=no-member
            id_parent_persistent=self.id_persistent
        )
        return set(
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
        id_parent_persistent: str,
        version: Optional[int] = None,
        **kwargs,
    ):
        """Changes a tag defintition in the database by adding a new version.
        Note:
            The resulting object is not saved.
        Returns:
            The new object
            and a flag indicating wether the object changed from the most recent version.
        """
        if id_parent_persistent is not None:
            try:
                parent = TagDefinition.most_recent_by_id(id_parent_persistent)
            except IndexError as exc:
                raise NoParentTagException(id_parent_persistent) from exc
            if not parent.type == TagDefinition.INNER:
                raise NoChildTagDefintionsAllowedException(id_parent_persistent)
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

    def check_value(self, val):
        "Check if a value is of the type for this tag."
        if self.type == TagDefinition.INNER and val is not None:
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
        """Return the most recent version of an entity."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            "-previous_version"
        )[0]

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
    def by_tag_chunked(cls, id_tag_definition_persistent, offset, limit):
        "Get tag instances for a tag_id in chunks."
        # TODO(@mo-fu) There is no proper chunking yet.
        # The results are not grouped by entity!
        # Fine for now as we always get the whole column/tag.
        try:
            tag = TagDefinition.most_recent_by_id(id_tag_definition_persistent)
        except IndexError as exc:
            raise TagDefinitionMissingException(id_tag_definition_persistent) from exc
        if tag.type == TagDefinition.INNER:
            tags = tag.most_recent_children()
            tags.add(tag)
        else:
            tags = {tag}

        tag_ids = {tag.id_persistent for tag in tags}
        objects = cls.objects.filter(  # pylint: disable=no-member
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
