"API methods for showing assignment previews."

from typing import List, Optional

from django.http import HttpRequest
from ninja import Path, Router, Schema

from cosmae.column.models_django import Column
from cosmae.contribution.column.models_django import (
    ColumnContribution,
    ValueContribution,
)
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.justification.models_django import EntityJustification
from cosmae.util.auth import check_user
from cosmae.value.models_django import value_objects

router = Router()


class Preview(Schema):
    "API model for preview"

    # pylint: disable=too-few-public-methods
    contribution_values: List[str]
    destination_values: Optional[List[str]]


@router.get(
    "{id_column_persistent}",
    response={200: Preview, 401: ApiError, 404: ApiError, 500: ApiError},
)
def get_preview(
    request: HttpRequest,
    id_column_persistent: str,
    id_contribution_persistent: str = Path(...),
):
    "Get preview for column assignment"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    try:
        contribution = ContributionCandidate.by_id_persistent(
            id_contribution_persistent, user
        ).get()
        column_contribution = ColumnContribution.get_by_id_persistent(
            id_column_persistent, contribution
        )
        contribution_values = (
            ValueContribution.objects.filter(  # pylint: disable=no-member
                column=column_contribution
            )
        )
        id_column_persistent = column_contribution.id_existing_persistent
        if id_column_persistent is None:
            destination_values = []
        elif id_column_persistent == "display_txt":
            destination_values = [
                entity.display_txt
                for entity in Entity.objects.primary_only()
                .exclude_contributed()
                .filter(display_txt__isnull=False)
                .chunk(0, 10)
            ]
        elif id_column_persistent == "id_persistent":
            destination_values = [
                entity.id_persistent
                for entity in Entity.objects.primary_only().chunk(0, 10)
            ]

        elif id_column_persistent == "justification":
            destination_values = list(
                EntityJustification.objects.all()[:10].values_list("text", flat=True)
            )
        else:
            destination_values = [
                value.value
                for value in value_objects().by_column_chunked_queryset(
                    id_column_persistent, 0, 10
                )
            ]

        return 200, Preview(
            contribution_values=[value.value for value in contribution_values],
            destination_values=destination_values,
        )
    except ContributionCandidate.DoesNotExist:  # pylint: disable = no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except ColumnContribution.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contributed column does not exist")
    except Column.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Destination column does not exist.")
    except Exception:  #  pylint: disable=broad-except
        return 500, ApiError(msg="Could not get preview.")
