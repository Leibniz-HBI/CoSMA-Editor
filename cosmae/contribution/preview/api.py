"API methods for showing assignment previews."
from typing import List, Optional

from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution,
    TagInstanceContribution,
)
from cosmae.entity.models_django import Entity
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.tag.models_django import TagDefinition, TagInstance
from cosmae.util.auth import check_user

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
):
    "Get preview for tag definition assignment"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    try:
        id_contribution_persistent = request.resolver_match.captured_kwargs[
            "id_contribution_persistent"
        ]
        contribution = ContributionCandidate.by_id_persistent(
            id_contribution_persistent, user
        ).get()
        tag_definition_contribution = TagDefinitionContribution.get_by_id_persistent(
            id_column_persistent, contribution
        )
        contribution_values = (
            TagInstanceContribution.objects.filter(  # pylint: disable=no-member
                tag_definition=tag_definition_contribution
            )
        )
        id_tag_definition_persistent = (
            tag_definition_contribution.id_existing_persistent
        )
        if id_tag_definition_persistent is None:
            destination_values = []
        elif id_tag_definition_persistent == "display_txt":
            destination_values = [
                entity.display_txt
                for entity in Entity.get_most_recent_chunked(
                    0,
                    10,
                    manager=Entity.objects_all().filter(display_txt__isnull=False),
                )
            ]
        else:
            destination_values = [
                value.value
                for value in TagInstance.by_tag_chunked(
                    id_tag_definition_persistent, 0, 10
                )
            ]

        return 200, Preview(
            contribution_values=[value.value for value in contribution_values],
            destination_values=destination_values,
        )
    except ContributionCandidate.DoesNotExist:  # pylint: disable = no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except TagDefinitionContribution.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contributed column does not exist")
    except TagDefinition.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Destination tag definition does not exist.")
    except Exception:  #  pylint: disable=broad-except
        return 500, ApiError(msg="Could not get preview.")
