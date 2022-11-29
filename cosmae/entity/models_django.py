"""Models for entities."""
from datetime import datetime
from sys import modules
from typing import Optional

from django.db import models
from django.db.models.aggregates import Count, Max, Min

from cosmae.exception import EntityExistsException, EntityUpdatedException


class SingleInheritanceManager(models.Manager):
    # pylint: disable=too-few-public-methods
    """A Django database manger for single inheritance tables."""

    def get_queryset(self):
        """Only include objects in queryset matching a specific class."""
        return super().get_queryset().filter(proxy_name=self.model.__name__.lower())


class Entity(models.Model):
    """Model for a general entity"""

    PROXY_FIELD_NAME = "proxy_name"

    proxy_name = models.TextField()
    display_txt = models.TextField()
    time_edit = models.DateTimeField()
    id_persistent = models.TextField(null=False, blank=False)
    previous_version = models.ForeignKey(
        "self", blank=True, null=True, on_delete=models.CASCADE, unique=True
    )
    names_personal = models.TextField(null=True)
    names_family = models.TextField(null=True)

    def __new__(cls, *args, **kwargs):
        try:
            # get proxy name, either from kwargs or from args
            # This is taken from https://stackoverflow.com/a/60894618
            proxy_name = kwargs.get(cls.PROXY_FIELD_NAME)
            if proxy_name is None:
                # pylint: disable=no-member
                proxy_name_field_index = cls._meta.fields.index(
                    cls._meta.get_field(cls.PROXY_FIELD_NAME)
                )
                proxy_name = args[proxy_name_field_index]
            # get proxy class, by name, from current module
            entity_class = getattr(modules[__name__], proxy_name)
        except (KeyError, AttributeError, IndexError):
            entity_class = cls
        return super().__new__(entity_class)

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of an entity."""
        # pylint: disable=no-member
        return cls.objects.filter(id_persistent=id_persistent).order_by(
            "-previous_version"
        )[0]

    @classmethod
    def change_or_create(
        cls,
        id_persistent: str,
        time_edit: datetime,
        display_txt: str,
        version: Optional[int] = None,
        **kwargs
    ):
        """Changes an entity in the databse by adding a new version.
        Note:
            The resulting object is not saved.
        Returns:
            The new object.
        """
        # pylint: disable=no-member
        if version:
            most_recent = cls.most_recent_by_id(id_persistent)
            if most_recent.id != version:
                raise EntityUpdatedException(id_persistent)
        else:
            by_id = cls.objects.filter(id_persistent=id_persistent)
            if by_id:
                raise EntityExistsException(display_txt)
            most_recent = None
        new = cls(
            display_txt=display_txt,
            time_edit=time_edit,
            id_persistent=id_persistent,
            previous_version=most_recent,
            **kwargs
        )
        do_write = (not most_recent) or most_recent.check_different_before_save(new)
        if do_write:
            return new, True
        return most_recent, False

    @classmethod
    def get_most_recent_chunked(cls, offset, limit):
        """Get all entities in chunks"""
        # pylint: disable=no-member
        ids = (
            cls.objects.values("id_persistent")
            .annotate(max_id=Max("id"))
            .annotate(min_id=Min("id"))
            .order_by("min_id")[offset : offset + limit]
            .values("max_id")
        )
        return list(cls.objects.filter(id__in=ids))

    @classmethod
    def get_count(cls):
        """Get the number of entities"""
        # pylint: disable=no-member
        return cls.objects.aggregate(Count("id_persistent", distinct=True))[
            "id_persistent__count"
        ]

    def save(self, *args, **kwargs):
        self.proxy_name = type(self).__name__.lower()
        super().save(*args, **kwargs)

    def check_different_before_save(self, other):
        """Checks structural equality for two entities.
        Note:
            * The version fields are not comapred as this check is intended to
               prevent unnecessary writes.
            * The proxy_type fields are not compared as they are only set
              before writing to the DB.
            * The time_edit fields are not compared as the operation is invalid."""
        if other.names_personal != self.names_personal:
            return True
        if other.names_family != self.names_family:
            return True
        if other.id_persistent != self.id_persistent:
            return True
        if other.display_txt != self.display_txt:
            return True
        return False
