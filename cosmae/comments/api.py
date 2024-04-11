"API methods for comments"
from typing import Dict, List

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.comments.models_django import Comment as CommentDb
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user


class Comment(Schema):
    "API model for comments"
    # pylint: disable=too-few-public-methods
    content: str


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
                id_persistent: [
                    Comment(content=comment.content) for comment in comments
                ]
                for id_persistent, comments in comments_by_id.items()
            }
        )
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get requested comments")


@router.post(
    "{relates_to_id_persistent}",
    response={200: None, 400: ApiError, 401: ApiError, 403: ApiError, 500: ApiError},
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
        CommentDb.add_comment(relates_to_id_persistent, comment.comment.content)
        return 200, None
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not write comment")
