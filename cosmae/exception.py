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
