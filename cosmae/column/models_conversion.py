"Model conversions for columns."

from datetime import datetime

from cosmae.column.models_api import ColumnResponse
from cosmae.column.models_django import Column as ColumnDb
from cosmae.column.queue import get_column_name_path, get_column_name_path_from_parts
from cosmae.user.model_conversion.public import (
    permission_group_db_to_api,
    user_db_to_public_user_info,
)

_column_type_mapping_db_to_api = {
    ColumnDb.BOOL: "BOOL",
    ColumnDb.INNER: "INNER",
    ColumnDb.FLOAT: "FLOAT",
    ColumnDb.STRING: "STRING",
    # fallback for retrieval from display text cache
    # where type is already converted to string
    "STRING": "STRING",
    "INNER": "INNER",
    "FLOAT": "FLOAT",
    "BOOL": "BOOL",
}

column_type_mapping_api_to_db = {
    "BOOL": ColumnDb.BOOL,
    "INNER": ColumnDb.INNER,
    "FLOAT": ColumnDb.FLOAT,
    "STRING": ColumnDb.STRING,
}


def column_db_dict_to_api(
    column: ColumnDb, up_until_time: datetime | None = None
) -> ColumnResponse:
    "Convert a column from database to API model."
    id_persistent = column["id_persistent"]
    id_version = column["id"]
    name = column["name"]
    if column["owner"] is None or column["owner"]["username"] is None:
        owner = None
    else:
        owner = column["owner"]
        owner["permission_group"] = permission_group_db_to_api[
            owner["permission_group"]
        ]
    return ColumnResponse(
        id_persistent=id_persistent,
        id_parent_persistent=column["id_parent_persistent"],
        name=name,
        description=column["description"],
        name_path=get_column_name_path_from_parts(id_version, name, up_until_time),
        version=id_version,
        type=_column_type_mapping_db_to_api[column["type"]],
        owner=owner,
        curated=column["curated"],
        hidden=column["hidden"],
        disabled=column["disabled"],
    )


def column_db_to_api(
    column: ColumnDb, up_until_time: datetime | None = None
) -> ColumnResponse:
    "Convert a column from database to API model."
    owner = column.owner
    if owner is None:
        username = None
    else:
        username = user_db_to_public_user_info(owner)
    return ColumnResponse(
        id_persistent=column.id_persistent,
        id_parent_persistent=column.id_parent_persistent,
        name=column.name,
        description=column.description,
        name_path=get_column_name_path(column, up_until_time),
        version=column.id,
        type=_column_type_mapping_db_to_api[column.type],
        owner=username,
        curated=column.curated,
        hidden=column.hidden,
        disabled=column.disabled,
    )
