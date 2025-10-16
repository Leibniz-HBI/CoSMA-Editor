"""Convenience methods for accessing API columns."""

from datetime import datetime

from django.http import HttpRequest

from cosmae.column.api import PostGetChildrenRequest, post_get_column_children


def post_column_children(
    request: HttpRequest,
    id_parent_persistent,
    up_until_time: datetime | None = None,
):
    """Test method for getting children of a column."""
    return post_get_column_children(
        request,
        PostGetChildrenRequest(
            id_parent_persistent=id_parent_persistent, up_until_time=up_until_time
        ),
    )
