"Model conversions for values"

from cosmae.value.models_api import TagInstancePost
from cosmae.value.models_django import ValueAbstract as TagInstanceAbstractDb


def tag_instance_db_to_api(tag_db: TagInstanceAbstractDb) -> TagInstancePost:
    "Convert tag instances from database to API representation."
    return TagInstancePost(
        id_persistent=tag_db.id_persistent,
        id_entity_persistent=tag_db.id_entity_persistent,
        id_tag_definition_persistent=tag_db.id_column_persistent,
        value=tag_db.value,
        version=tag_db.id,
    )
