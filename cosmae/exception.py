# pylint: disable=too-few-public-methods
"""Exceptions for CoSMA-Editor"""
from ninja import Schema


class ApiError(Schema):
    "A class for basic HTTP errors."
    msg: "str"


class ResourceLockedException(Exception):
    """Indicates that a resource is locked."""


class NotAuthenticatedException(Exception):
    """Indicates that a user is not authenticated."""


class ValidationException(Exception):
    """Indicates an error during conversion"""


class DbObjectExistsException(Exception):
    """Indicates that an db object with that persistent id already exists."""

    def __init__(self, display_txt) -> None:
        self.display_txt = display_txt


class TagInstanceExistsException(Exception):
    "Indicates that the value for a given tag already exists."

    def __init__(self, id_entity_persistent, id_tag_definition_persistent, value):
        self.id_entity_persistent = id_entity_persistent
        self.id_tag_definition_persistent = id_tag_definition_persistent
        self.value = value


class EntityUpdatedException(Exception):
    """Indicates that an entity has been already updated."""

    def __init__(self, new_value) -> None:
        self.new_value = new_value


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

    def __init__(self, tag_id_persistent, value, type_name):
        self.tag_id_persistent = tag_id_persistent
        self.value = value
        self.type_name = type_name


class TagDefinitionExistsException(Exception):
    "Indicates that the tag already exists."

    def __init__(self, tag_name, id_persistent, id_parent_persistent):
        self.tag_name = tag_name
        self.id_persistent = id_persistent
        self.id_parent_persistent = id_parent_persistent


class EntityMissingException(Exception):
    "Indicates that there is no entity with the given persistent id."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class TagDefinitionMissingException(Exception):
    "Indicates that there is no tag definition with the given persistent id."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent
