"Queue methods for quality checks"

from logging import getLogger
from uuid import uuid4

from django.db.models import OuterRef, Q, Subquery

from cosmae.merge_request.entity.models_django import EntityMergeRequest
from cosmae.util import timestamp
from cosmae.value.models_django import value_objects

_LOGGER = getLogger(__name__)


def find_duplicates_in_column(id_column_persistent):
    """Find duplicates in a given column"""
    try:
        values = value_objects().filter(id_column_persistent=id_column_persistent)
        other_values_subquery = (
            value_objects()
            .filter(id_column_persistent=id_column_persistent)
            .filter(
                (~Q(id_entity_persistent=OuterRef("id_entity_persistent")))
                & Q(value=OuterRef("value"))
                & Q(id__gt=OuterRef("id"))  # make sure duplicate is not found twice.
            )
        )
        with_duplicate_info = values.annotate(
            id_duplicate_entity_candidate_persistent=Subquery(
                other_values_subquery[:1].values("id_entity_persistent")
            )
        )
        duplicate_candidate_pairs = with_duplicate_info.filter(
            id_duplicate_entity_candidate_persistent__isnull=False
        ).values("id_entity_persistent", "id_duplicate_entity_candidate_persistent")
        for duplicate_candidate_pair in duplicate_candidate_pairs:
            EntityMergeRequest.objects.get_or_create(
                state=EntityMergeRequest.State.CONFLICTS,
                id_origin_persistent=duplicate_candidate_pair["id_entity_persistent"],
                id_destination_persistent=duplicate_candidate_pair[
                    "id_duplicate_entity_candidate_persistent"
                ],
                created_at=timestamp(),
                id_persistent=uuid4(),
                created_by=None,
            )
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error(
            "Error while finding duplicates in column with id_persistent: %s",
            id_column_persistent,
            exc_info=exc,
        )
