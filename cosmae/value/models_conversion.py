"Model conversions for values"

from cosmae.value.models_api import ValuePost
from cosmae.value.models_django import ValueAbstract as ValueAbstractDb


def value_db_to_api(value_db: ValueAbstractDb) -> ValuePost:
    "Convert values from database to API representation."
    return ValuePost(
        id_persistent=value_db.id_persistent,
        id_entity_persistent=value_db.id_entity_persistent,
        id_column_persistent=value_db.id_column_persistent,
        value=value_db.value,
        version=value_db.id,
    )
