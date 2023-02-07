"""Django models for organisations."""
from django.db import models

from cosmae.entity.models_django import Entity


class Organisation(Entity):
    """Models an organisation"""

    name = models.CharField(max_length=512)

    # pylint: disable=missing-class-docstring, too-few-public-methods
    class Meta:
        proxy = True
