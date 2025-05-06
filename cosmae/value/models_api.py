"API models for versioned values"

from ninja import Schema


class ValuePost(Schema):
    # pylint: disable=too-few-public-methods
    "A single API value for post requests."
    id_entity_persistent: str
    id_column_persistent: str
    value: str | None = None
    id_persistent: str | None = None
    version: int | None = None
