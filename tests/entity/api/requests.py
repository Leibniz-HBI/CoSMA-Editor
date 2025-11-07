"""Request methods for entity-related API endpoints."""

from datetime import datetime

from django.http import HttpRequest

from cosmae.entity.api import FilterRequest, filter_entities
from cosmae.entity.models_api import FilterClause


def post_entity_filter(
    request: HttpRequest,
    filter_body: FilterClause,
    up_until_time: datetime | None = None,
    offset: int = 0,
    limit: int = 100,
):
    """Test method for filtering entities via the API."""
    return filter_entities(
        request,
        FilterRequest(
            filter=filter_body,
            up_until_time=up_until_time,
            offset=offset,
            limit=limit,
        ),
    )
