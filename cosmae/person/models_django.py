"""Models for natural persons."""
from cosmae.entity.models_django import Entity, SingleInheritanceManager


class Person(Entity):
    """Models a natural person"""

    @classmethod
    @property
    def valid_keys(cls):
        return super().valid_keys.union(
            {
                "names_personal",
                "names_family",
            }
        )

    def __init__(
        self,
        *args,
        **kwargs,
    ):
        if kwargs:
            additional_keys = super().remove_valid_keys(set(kwargs.keys()))
            additional_keys = self.remove_valid_keys(additional_keys)
            if len(additional_keys) > 0:
                raise Exception(
                    f'The fields { ", ".join(additional_keys)} are not valid for persons.'
                )
            super().__init__(*args, **kwargs)
        else:
            super().__init__(
                *args,
            )

    # pylint: disable=missing-class-docstring, too-few-public-methods
    class Meta:
        proxy = True

    objects = SingleInheritanceManager()
