"API methods for merge requests."
import logging
from datetime import datetime
from typing import List

from django.db import DatabaseError
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.merge_request.models_django import MergeRequest as MergeRequestDb
from cosmae.tag.api.definitions import TagDefinition, tag_definition_db_to_api
from cosmae.tag.models_django import TagDefinition as TagDefinitionDb
from cosmae.user.api import PublicUserInfo, user_db_to_public_user_info
from cosmae.util.auth import check_user

router = Router()


class MergeRequest(Schema):
    # pylint: disable=too-few-public-methods
    "API Model for a single merge request"
    id_persistent: str
    created_by: PublicUserInfo
    destination: TagDefinition
    origin: TagDefinition
    created_at: datetime
    assigned_to: PublicUserInfo


class MergeRequestResponseList(Schema):
    # pylint: disable=too-few-public-methods
    "Response schema for all merge requests of a user."
    created: List[MergeRequest]
    assigned: List[MergeRequest]


@router.get(
    "",
    response={
        200: MergeRequestResponseList,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_merge_requests(request: HttpRequest):
    "API method for retrieving merge requests."
    try:
        user = check_user(request)
        by_user = MergeRequestDb.created_by_user(user)
        assigned_to_user = MergeRequestDb.assigned_to_user(user)
        return 200, MergeRequestResponseList(
            created=[merge_request_db_to_api(mr) for mr in by_user],
            assigned=[merge_request_db_to_api(mr) for mr in assigned_to_user],
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError:
        return 500, ApiError(msg="Could not get the merge requests from the database.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning("exception", exc_info=exc)
        return 500, ApiError(msg="Could not get the requested merge requests.")


def merge_request_db_to_api(mr_db: MergeRequestDb) -> MergeRequest:
    "Transform a merge request form DB to API representation"
    destination = TagDefinitionDb.most_recent_by_id(mr_db.id_destination_persistent)
    origin = TagDefinitionDb.most_recent_by_id(mr_db.id_origin_persistent)
    return MergeRequest(
        id_persistent=str(mr_db.id_persistent),
        created_by=user_db_to_public_user_info(mr_db.created_by),
        destination=tag_definition_db_to_api(destination),
        origin=tag_definition_db_to_api(origin),
        created_at=mr_db.created_at,
        assigned_to=user_db_to_public_user_info(mr_db.assigned_to),
    )
