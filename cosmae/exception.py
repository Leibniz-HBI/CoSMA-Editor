# pylint: disable=too-few-public-methods
"""Exceptions for CoSMA-Editor"""
from ninja import Schema


class ApiError(Schema):
    "A class for basic HTTP errors."
    msg: "str"


class ValidationException(Exception):
    """Indicates an error during conversion"""


class DbObjectExistsException(Exception):
    """Indicates that an db object with that persistent id already exists."""

    def __init__(self, display_txt) -> None:
        self.display_txt = display_txt


class EntityUpdatedException(Exception):
    """Indicates that an entity has been already updated."""

    def __init__(self, id_affected) -> None:
        self.id_affected = id_affected


class TooManyFieldsException(Exception):
    "Indicates that a Django model constructor was called with too many arguments."


class NoChildTagDefintionsAllowedException(Exception):
    "Indicates that a tag definition is not allowed to have children."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class NoParentTagException(Exception):
    "Indicates that the tag with the specified id_persistent does not exist."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class InvalidTagValueException(Exception):
    "Indicates that a given value is not of the type defined by a tag."


class TagDefinitionExistsException(Exception):
    "Indicates that the tag already exists."

    def __init__(self, tag_name, id_parent_persistent):
        self.tag_name = tag_name
        self.id_parent_persistent = id_parent_persistent


class EntityMissingException(Exception):
    "Indicates that there is no entity with the given persistent id."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class TagDefinitionMissingException(Exception):
    "Indicates that there is no tag definition with the given persistent id."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent
