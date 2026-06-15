# pylint: disable=too-few-public-methods
"""Exceptions for CoSMA-Editor"""
from typing import Dict

from ninja import Schema


class ApiError(Schema):
    "A class for basic HTTP errors."

    msg: "str"


class ApiException(Exception):
    "An error that translates to an API message"

    def __init__(self, status_code: int, msg: str):
        self.status_code = status_code
        self.msg = msg

    def to_api_error_response(self):
        "Transform the exception to a tuple consisting of HTTP status code and ApiError."
        return self.status_code, ApiError(msg=self.msg)


class ResourceLockedException(Exception):
    """Indicates that a resource is locked."""


class NotAuthenticatedException(Exception):
    """Indicates that a user is not authenticated."""


class ForbiddenException(Exception):
    "Indicates that the requested resource can not be accessed."

    def __init__(self, type_name: str, id_resource: str) -> None:
        self.type_name = type_name
        self.id_resource = id_resource


class ValidationException(Exception):
    """Indicates an error during conversion"""


class DbObjectExistsException(Exception):
    """Indicates that an db object with that persistent id already exists."""

    def __init__(self, id_persistent: str, values: Dict[str, any]) -> None:
        self.id_persistent = id_persistent
        self.values = values


class ValueExistsException(Exception):
    "Indicates that the value for a given column already exists."

    def __init__(self, id_entity_persistent, id_column_persistent, value):
        self.id_entity_persistent = id_entity_persistent
        self.id_column_persistent = id_column_persistent
        self.value = value


class EntityUpdatedException(Exception):
    """Indicates that an entity has been already updated."""

    def __init__(self, new_value) -> None:
        self.new_value = new_value


class NoChildColumnAllowedException(Exception):
    "Indicates that a column is not allowed to have children."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class NoSelfParentColumnException(Exception):
    "Indicates that the column have itself as parent.."


class NoParentColumnException(Exception):
    "Indicates that the column with the specified id_persistent does not exist."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class InvalidValueException(Exception):
    "Indicates that a given value is not of the type defined by a column."

    def __init__(self, column_id_persistent, value, type_name):
        self.column_id_persistent = column_id_persistent
        self.value = value
        self.type_name = type_name


class DisabledColumnHasChildrenException(Exception):
    "Indicates that a column marked for disabling still has children."


class ColumnExistsException(Exception):
    "Indicates that the columnists."

    def __init__(self, column_name, id_persistent, id_parent_persistent):
        self.column_name = column_name
        self.id_persistent = id_persistent
        self.id_parent_persistent = id_parent_persistent


class EntityMissingException(Exception):
    "Indicates that there is no entity with the given persistent id."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent
        self.msg = f"Entity with id_persistent {id_persistent} does not exist."


class ColumnMissingException(Exception):
    "Indicates that there is no column with the given persistent id."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class PermissionException(Exception):
    "Indicates that there are insufficient permissions."

    def __init__(self, id_persistent) -> None:
        self.id_persistent = id_persistent


class ColumnPermissionException(Exception):
    "Indicates that there are insufficient permissions for writing to a column"

    def __init__(self, id_persistent) -> None:
        self.id_persistent = id_persistent


class ColumnDisabledException(Exception):
    "Indicates a write to a disabled column."

    def __init__(self, id_persistent):
        self.id_persistent = id_persistent


class UnmodifiableFieldException(Exception):
    "Indicates change to a field that is deemed unmodifiable"

    def __init__(self, field_name):
        self.field_name = field_name
