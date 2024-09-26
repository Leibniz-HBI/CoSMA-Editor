"Database model for configuration values"

from django.db import models


class AlreadyInListException(Exception):
    "Indicate that an element is already in a list."


class ConfigValue(models.Model):
    "Django ORM model for config values used by cosmae."

    key = models.TextField()
    value = models.TextField()
    idx = models.IntegerField(null=True, default=None)

    class Meta:
        "Meta model for config values"

        constraints = [models.UniqueConstraint("key", "idx", name="list_constraint")]

    @classmethod
    def get(cls, key, default=None):
        "Get a config value"
        values_list = list(cls.objects.filter(key=key).values_list("idx", "value"))
        if len(values_list) == 0:
            return default
        if len(values_list) == 1:
            if values_list[0][0] is None:
                return values_list[0][1]
        return [item[1] for item in sorted(values_list)]

    @classmethod
    def set(cls, key, value):
        "Set a config value."
        return cls.objects.update_or_create(  # pylint: disable=no-member
            key=key, defaults={"value": value}
        )

    @classmethod
    def append_to_list(cls, key, element, unique=True):
        "Append element to a list in a config value"
        if unique:
            unique_query = cls.objects.filter(key=key, value=element)
            if len(unique_query) > 0:
                raise AlreadyInListException()
        null_idx_query = cls.objects.filter(key=key, idx__isnull=True)
        if len(null_idx_query) > 0:
            raise ValueError()
        list_query = cls.objects.filter(key=key)
        max_query = (
            list_query.values("key")
            .annotate(idx__max=models.Max("idx"))
            .values("idx__max")
        )
        cls.objects.create(
            key=key,
            value=element,
            idx=models.functions.Coalesce(models.Subquery(max_query), -1) + 1,
        )

    @classmethod
    def remove_from_list(cls, key, element):
        "Remove an element from a list"
        try:
            element = cls.objects.filter(key=key, value=element).get()
        except cls.DoesNotExist:
            return
        element.delete()
        successors = cls.objects.filter(key=key, idx__gt=element.idx).annotate(
            idx=models.Value("idx") - 1
        )
        cls.objects.bulk_update(successors)
