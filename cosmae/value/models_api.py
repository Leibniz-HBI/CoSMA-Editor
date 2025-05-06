"API models for versioned values"

from ninja import Schema


class TagInstancePost(Schema):
    # pylint: disable=too-few-public-methods
    "A single API tag instance for post requests."
    id_entity_persistent: str
    id_tag_definition_persistent: str
    value: str | None = None
    id_persistent: str | None = None
    version: int | None = None
