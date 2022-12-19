"""Utils for Django"""
from typing import Iterable, Optional

from django.db.models import Model
from django.db.transaction import atomic

from cosmae.exception import EntityExistsException, EntityUpdatedException


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
    if version:
        most_recent = cls.most_recent_by_id(id_persistent)
        if most_recent.id != version:
            raise EntityUpdatedException(id_persistent)
    else:
        by_id = cls.objects.filter(id_persistent=id_persistent)
        if by_id:
            raise EntityExistsException("UNKNOWN")
        most_recent = None
    new = cls(
        id_persistent=id_persistent,
        previous_version=most_recent,
        **kwargs,
    )
    do_write = (not most_recent) or most_recent.check_different_before_save(new)
    if do_write:
        return new, do_write
    return most_recent, do_write
