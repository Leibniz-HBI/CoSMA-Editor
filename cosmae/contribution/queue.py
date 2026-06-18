"Queue methods for contributions."

from logging import getLogger

from django.db import transaction
from django_rq import enqueue

from cosmae.column.models_django import ColumnHistory
from cosmae.contribution.column.models_django import (
    ColumnContribution,
    ValueContribution,
)
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import EntityHistory
from cosmae.exception import ForbiddenException
from cosmae.merge_request.models_django import ColumnConflictResolution

_LOGGER = getLogger(__name__)


def delete_contribution(id_persistent):
    "Delete a contribution candidate by its id_persistent string."
    contribution_query = (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )
    )
    try:
        with transaction.atomic():
            contribution = (
                contribution_query.get()
            )  # select_for_update(nowait=True).get()
            if not contribution.mark_delete or contribution.state in [
                ContributionCandidate.ENTITIES_ASSIGNED,
                ContributionCandidate.ENTITIES_MATCHED,
                ContributionCandidate.VALUES_ASSIGNED,
                ContributionCandidate.MERGED,
            ]:
                return
            entity_duplicates = (
                EntityDuplicate.objects.filter(  # pylint: disable=no-member
                    contribution_candidate=contribution
                )
            )
            entity_duplicates.delete()
            entities = (
                EntityHistory.objects.filter(  # pylint: disable=no-member
                    contribution_candidate=contribution
                )
                .only_recent()
                .add_previous_versions()
            )
            entities.delete()
            column_contribution_queryset = (
                ColumnContribution.get_by_candidate_query_set(contribution)
            )
            values = ValueContribution.objects.filter(  # pylint: disable=no-member
                column__in=column_contribution_queryset
            )
            values.delete()
            merge_requests = (
                contribution.columnmergerequest_set.all()
            )  # pylint: disable=no-member
            resolutions = (
                ColumnConflictResolution.objects.filter(  # pylint: disable=no-member
                    merge_request__in=merge_requests
                )
            )
            resolutions.delete()
            for merge_request in merge_requests:
                try:
                    ColumnHistory.purge(
                        merge_request.id_origin_persistent, contribution.created_by
                    )
                except (
                    ForbiddenException,
                    ColumnHistory.DoesNotExist,  # pylint: disable=no-member
                ):
                    pass
            merge_requests.delete()
            contribution.delete()
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error(
            "Error while deleting contribution %s", id_persistent, exc_info=exc
        )


def enqueue_delete_contributions(id_persistent):
    "Enqueue contributions for deletion by their id_persistent string."
    enqueue(delete_contribution, id_persistent)
