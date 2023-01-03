"API methods for tag instances."
from datetime import datetime
from typing import List, Optional, Union
from uuid import uuid4

from django.db import IntegrityError
from ninja import Router, Schema

from cosmae.exception import (
    ApiError,
    EntityMissingException,
    EntityUpdatedException,
    InvalidTagValueException,
    TagDefinitionMissingException,
    TagInstanceExistsException,
    ValidationException,
)
from cosmae.tag.models_django import TagInstance as TagInstanceDb
from cosmae.util.django import save_many_atomic

router = Router()


class TagInstancePost(Schema):
    # pylint: disable=too-few-public-methods
    "A single API tag instance for post requests."
    id_entity_persistent: str
    id_tag_definition_persistent: str
    value: Union[float, int, None]
    id_persistent: Optional[str]
    version: Optional[int]


class TagInstancePostList(Schema):
    # pylint: disable=too-few-public-methods
    "Multiple tag instances for post requests."
    tag_instances: List[TagInstancePost]


@router.post("", response={200: TagInstancePostList, 400: ApiError, 500: ApiError})
def post_tag_instance(_, tag_list: TagInstancePostList):
    "Create or change a tag instance."
    # pylint: disable=too-many-return-statements
    tag_apis = tag_list.tag_instances
    now = datetime.utcnow()
    try:
        tag_dbs = [tag_instance_api_to_db(tag, now) for tag in tag_apis]
    except ValidationException as exc:
        return 400, ApiError(msg=str(exc))
    except TagInstanceExistsException as exc:
        return 500, ApiError(
            msg="Could not generate id_persistent for tag instance with "
            f"id_entity_persistent {exc.id_entity_persistent}, "
            f"id_tag_definition_persistent {exc.id_tag_definition_persistent} and "
            f"value {exc.value}."
        )
    except EntityMissingException as exc:
        return 400, ApiError(
            msg=f"There is no entity with id_persistent {exc.id_persistent}."
        )
    except TagDefinitionMissingException as exc:
        return 400, ApiError(
            msg=f"There is no tag definition with id_persistent {exc.id_persistent}."
        )
    except InvalidTagValueException as exc:
        return 400, ApiError(
            msg=f"Value {exc.value} should be of type {exc.type_name} "
            f"for tag with id_persistent {exc.tag_id_persistent}."
        )
    except EntityUpdatedException as exc:
        return 500, ApiError(
            msg="There has been a concurrent modification "
            f"to the tag instance with id_persistent {exc.id_affected}."
        )
    tag_db_saves = [tag for tag, do_write in tag_dbs if do_write]
    try:
        save_many_atomic(tag_db_saves)
    except IntegrityError:
        return 500, ApiError(msg="Provided data not consistent with database.")
    return 200, TagInstancePostList(
        tag_instances=[tag_instance_db_to_api(tag) for tag, _ in tag_dbs]
    )


def tag_instance_api_to_db(tag_api: TagInstancePost, time: datetime):
    "Convert a tag instance from API to databse representation."
    if tag_api.id_persistent:
        persistent_id = tag_api.id_persistent
        if tag_api.version is None:
            raise ValidationException(
                f"Tag instance with id_persistent {tag_api.id_persistent} "
                "has no previous version."
            )
    else:
        if tag_api.version:
            raise ValidationException(
                f"Tag instance with id_entity_persistent {tag_api.id_entity_persistent}, "
                f"id_tag_definition_persistent {tag_api.id_tag_definition_persistent} and "
                f"value {tag_api.value} has version but no id_persistent."
            )
        persistent_id = str(uuid4())
    return TagInstanceDb.change_or_create(
        id_persistent=persistent_id,
        id_entity_persistent=tag_api.id_entity_persistent,
        id_tag_definition_persistent=tag_api.id_tag_definition_persistent,
        value=tag_api.value,
        time_edit=time,
        version=tag_api.version,
    )


def tag_instance_db_to_api(tag_db: TagInstanceDb) -> TagInstancePost:
    "Convert tag istances from databse to API representation."
    return TagInstancePost(
        id_persistent=tag_db.id_persistent,
        id_entity_persistent=tag_db.id_entity_persistent,
        id_tag_definition_persistent=tag_db.id_tag_definition_persistent,
        value=tag_db.value,
        version=tag_db.id,
    )
