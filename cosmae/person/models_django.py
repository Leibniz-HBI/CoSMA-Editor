"""Models for natural persons."""
from cosmae.entity.models_django import Entity, SingleInheritanceManager

_person_keys = {
    "names_personal",
    "names_family",
}


class Person(Entity):
    """Models a natural person"""

    @classmethod
    def valid_keys(cls):
        return _person_keys

    # pylint: disable=missing-class-docstring, too-few-public-methods
    class Meta:
        proxy = True

    objects = SingleInheritanceManager()
