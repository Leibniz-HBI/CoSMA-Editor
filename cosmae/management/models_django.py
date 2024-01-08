"Database model for configuration values"
from django.db import models


class AlreadyInListException(Exception):
    "Indicate that an element is already in a list."


class ConfigValue(models.Model):
    "Django ORM model for config values used by cosmae."
    key = models.TextField(unique=True)
    value = models.JSONField()

    @classmethod
    def get(cls, key, default=None):
        "Get a config value"
        try:
            return (
                cls.objects.filter(key=key)  # pylint: disable= no-member
                .values_list("value", flat=True)
                .get()
            )
        except ConfigValue.DoesNotExist:  # pylint: disable= no-member
            return default

    @classmethod
    def set(cls, key, value):
        "Set a config value."
        return cls.objects.update_or_create(  # pylint: disable=no-member
            key=key, defaults={"value": value}
        )

    @classmethod
    def append_to_list(cls, key, element, unique=True):
        "Append element to a list in a config value"
        existing = cls.get(key, default=[])
        assert isinstance(existing, list)
        if unique:
            # make sure element does not already exist
            try:
                existing.index(element)
                raise AlreadyInListException
            except ValueError:
                pass
        existing.append(element)
        cls.set(key, existing)

    @classmethod
    def remove_from_list(cls, key, element):
        "Remove an element from a list"
        existing = cls.get(key, default=[])
        assert isinstance(existing, list)
        existing.remove(element)
        cls.set(key, existing)
