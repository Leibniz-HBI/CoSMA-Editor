"""Utils for Django"""
from typing import Iterable

from django.db.models import Model
from django.db.transaction import atomic


def save_many_atomic(models: Iterable[Model]):
    """Save multiple models and roll back on failure."""
    with atomic():
        for model in models:
            model.save()
