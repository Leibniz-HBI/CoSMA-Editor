"""Models for natural persons."""
from cosmae.entity.models_django import Entity, SingleInheritanceManager


class Person(Entity):
    """Models a natural person"""

    # pylint: disable=missing-class-docstring, too-few-public-methods
    class Meta:
        proxy = True

    objects = SingleInheritanceManager()
