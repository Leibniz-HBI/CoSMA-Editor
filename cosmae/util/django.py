"""Utils for Django"""
import logging
from functools import lru_cache
from typing import Iterable, Optional, Type

from django.conf import settings
from django.contrib.postgres.aggregates import JSONBAgg
from django.db.models import Aggregate, JSONField, Model
from django.db.transaction import atomic

from cosmae.exception import DbObjectExistsException, EntityUpdatedException


def save_many_atomic(models: Iterable[Model]):
    """Save multiple models and roll back on failure."""
    with atomic():
        for model in models:
            model.save()


def change_or_create_versioned(
    cls,
    id_persistent: str,
    version: Optional[int] = None,
    **kwargs,
):
    """Changes a versioned model instance in the database by adding a new version.
    Note:
        The resulting object is not saved.
    Returns:
        The new object and a flag indicating wether the object changed from the most recent version.
    """
    if version is not None:
        most_recent = cls.most_recent_by_id(id_persistent)
        if most_recent.id != version:
            raise EntityUpdatedException(most_recent)
    else:
        by_id = cls.objects.filter(id_persistent=id_persistent)
        if by_id:
            raise DbObjectExistsException("UNKNOWN")
        most_recent = None
    if most_recent is None:
        new_values = {}
    else:
        new_values = {
            field.attname: getattr(most_recent, field.attname)
            for field in cls._meta.get_fields()  # pylint: disable=protected-access
            if hasattr(field, "attname")
        }
    for field_name, value in kwargs.items():
        new_values[field_name] = value
    new_values["id_persistent"] = id_persistent
    if most_recent:
        new_values.pop("id")
        new_values["previous_version_id"] = most_recent.id
    new = cls(
        # special handling for relation to previous version necessary
        **new_values,
    )
    do_write = (not most_recent) or most_recent.check_different_before_save(new)
    if do_write:
        return new, do_write
    return most_recent, do_write


def patch_from_dict(object_db, **kwargs):
    """Updates a model object from a dict and tracks the updated fields.
    This is required for (pre)|(post)_save signals to get a list of updated fields."""
    for key, value in kwargs.items():
        setattr(object_db, key, value)
    logging.warning(list(kwargs))
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
