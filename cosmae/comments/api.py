"API methods for comments"

from datetime import datetime
from typing import Dict, List

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.comments.models_django import Comment as CommentDb
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.user.models_conversion import PublicUserInfo, user_db_to_public_user_info
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user


class CommentContent(Schema):
    "API model for comment contents"

    # pylint: disable=too-few-public-methods
    content: str


class Comment(CommentContent):
    "API model for comments"

    # pylint: disable=too-few-public-methods
    author: PublicUserInfo
    timestamp: datetime


class GetCommentsRequest(Schema):
    "Body for requesting comments"

    # pylint: disable=too-few-public-methods
    id_persistent_list: List[str]


class GetCommentsResponse(Schema):
    "Response containing requested comments"

    # pylint: disable=too-few-public-methods
    comments_by_id_persistent: Dict[str, List[Comment]]


class PostCommentRequest(Schema):
    "Body for posting new comments."

    # pylint: disable=too-few-public-methods
    comment: CommentContent


class PostCommentResponse(Schema):
    "Body for posting new comments."

    # pylint: disable=too-few-public-methods
    comment: Comment


router = Router()


@router.post(
    "",
    response={
        200: GetCommentsResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_get_comments(request: HttpRequest, args: GetCommentsRequest):
    "API method for getting comments"
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="Insufficient permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        comments_by_id = CommentDb.for_resources(args.id_persistent_list)
        return 200, GetCommentsResponse(
            comments_by_id_persistent={
                id_persistent: [comment_db_to_api(comment) for comment in comments]
                for id_persistent, comments in comments_by_id.items()
            }
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested comments")


@router.post(
    "{relates_to_id_persistent}",
    response={
        200: PostCommentResponse,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def post_comment(
    request: HttpRequest, relates_to_id_persistent: str, comment: PostCommentRequest
):
    "API method for adding comments"
    try:
        user = check_user(request)
        if user.permission_group == CosmaeUser.APPLICANT:
            return 403, ApiError(msg="Insufficient permissions")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    try:
        comment = CommentDb.add_comment(
            relates_to_id_persistent, comment.comment.content, user, timestamp()
        )
        return 200, PostCommentResponse(comment=comment_db_to_api(comment))
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not write comment")


def comment_db_to_api(comment_db):
    "Transforms a comment from database to API representation"
    return Comment(
        content=comment_db.content,
        author=user_db_to_public_user_info(comment_db.author),
        timestamp=comment_db.timestamp,
    )
