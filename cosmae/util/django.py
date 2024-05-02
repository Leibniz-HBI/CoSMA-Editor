"""Utils for Django"""

from functools import lru_cache
from typing import Iterable, Type

from django.conf import settings
from django.contrib.postgres.aggregates import JSONBAgg
from django.db.models import Aggregate, JSONField, Model
from django.db.transaction import atomic


def save_many_atomic(models: Iterable[Model]):
    """Save multiple models and roll back on failure."""
    with atomic():
        for model in models:
            model.save()


def patch_from_dict(object_db, **kwargs):
    """Updates a model object from a dict and tracks the updated fields.
    This is required for (pre)|(post)_save signals to get a list of updated fields."""
    for key, value in kwargs.items():
        setattr(object_db, key, value)
    object_db.save(update_fields=list(kwargs))


class JsonGroupArray(Aggregate):  # pylint: disable=abstract-method
    "Django JSON array aggregation for SQLite"

    function = "JSON_GROUP_ARRAY"
    output_field = JSONField()
    template = "%(function)s(%(distinct)s%(expressions)s)"


@lru_cache(maxsize=1)
def get_json_array_agg() -> Type[Aggregate]:
    "Returns class for json array aggregation depending on database backend."
    connection_type = get_db_default_connection_type()
    if connection_type == "postgresql":
        return JSONBAgg
    if connection_type == "sqlite3":
        return JsonGroupArray
    raise Exception(  # pylint: disable=broad-exception-raised
        f"Array Aggregation not supported for backend {connection_type}"
    )


def get_db_default_connection_type():
    "Get the type of the default database as string."
    return settings.DATABASES["default"]["ENGINE"].split(".")[-1]
