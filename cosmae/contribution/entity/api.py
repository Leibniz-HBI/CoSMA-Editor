"API methods for entities of a contribution"
import logging
from typing import Dict, List, Optional

from django.db import transaction
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.contribution.entity.match_entities import find_matches
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.person.api import PersonNatural, PersonNaturalList, person_db_to_api
from cosmae.util.auth import check_user

router = Router()


class ScoredMatch(Schema):
    "API model for combining an entity with a similarity score"
    # pylint: disable=too-few-public-methods
    similarity: float
    entity: PersonNatural


class ScoredMatchesWithDuplicateAssignment(Schema):
    "API model for combining scored matches with the id of a selected duplicate"
    # pylint: disable=too-few-public-methods
    matches: List[ScoredMatch]
    assigned_duplicate: Optional[PersonNatural]


class ScoredMatchResponse(Schema):
    "API model for multiple scored matches"
    # pylint: disable=too-few-public-methods
    matches: Dict[str, ScoredMatchesWithDuplicateAssignment]


class PostSimilarRequest(Schema):
    "API model for requesting similar entities."
    # pylint: disable=too-few-public-methods
    entity_id_persistent_list: List[str]


class PutDuplicateRequest(Schema):
    "API model for requesting similar entities."
    # pylint: disable=too-few-public-methods
    id_entity_destination_persistent: Optional[str]


class PutDuplicateResponse(Schema):
    "API Response for put duplicate request"
    # pylint: disable=too-few-public-methods
    assigned_duplicate: Optional[PersonNatural]


@router.get(
    "chunk/{start}/{offset}",
    response={200: PersonNaturalList, 401: ApiError, 404: ApiError, 500: ApiError},
)
def get_entities(request: HttpRequest, start: int, offset: int):
    "API method for getting entities of a contribution candidate."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")

    id_contribution_persistent = request.resolver_match.captured_kwargs[
        "id_contribution_persistent"
    ]
    try:
        candidate = ContributionCandidate.by_id_persistent(
            id_contribution_persistent, user
        ).get()
        entities_db = candidate.get_entities_chunked(start, offset)
        return 200, PersonNaturalList(
            persons=[person_db_to_api(person) for person in entities_db]
        )
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        return 500, ApiError(msg="Could not get entities of the contribution.")


@router.post(
    "similar",
    response={200: ScoredMatchResponse, 401: ApiError, 404: ApiError, 500: ApiError},
)
def post_similar(request: HttpRequest, similar_request: PostSimilarRequest):
    "API method for getting existing entities similar to contributed ones"
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")

    id_contribution_persistent = request.resolver_match.captured_kwargs[
        "id_contribution_persistent"
    ]

    try:
        scored_matches = []
        candidate = ContributionCandidate.by_id_persistent(
            id_contribution_persistent, user
        ).get()
        for id_entity_persistent in similar_request.entity_id_persistent_list:
            entity = Entity.most_recent_by_id(id_entity_persistent)
            if entity.contribution_candidate.id_persistent != candidate.id_persistent:
                return 404, ApiError(msg="Entity does not exist")
            matches = find_matches(entity)
            try:
                duplicate_query = (
                    EntityDuplicate.objects.filter(  # pylint: disable=no-member
                        id_origin_persistent=id_entity_persistent
                    )
                )
                logging.warning(duplicate_query)
                assigned_duplicate = duplicate_query.get().id_destination_persistent
            except EntityDuplicate.DoesNotExist:  # pylint: disable=no-member
                assigned_duplicate = None
            except EntityDuplicate.MultipleObjectsReturned:  # pylint: disable=no-member
                assigned_duplicate = duplicate_query[0].id_destination_persistent
                duplicate_query[1:].delete()
            if assigned_duplicate:
                assigned_duplicate = person_db_to_api(
                    Entity.most_recent_by_id(assigned_duplicate)
                )
            scored_matches.append(
                (
                    id_entity_persistent,
                    ScoredMatchesWithDuplicateAssignment(
                        matches=[scored_match_db_to_api(match) for match in matches],
                        assigned_duplicate=assigned_duplicate,
                    ),
                )
            )
        return 200, ScoredMatchResponse(matches=dict(scored_matches))
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except IndexError:  # pylint: disable=no-member
        return 404, ApiError(msg="Entity does not exist.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(exc)
        return 500, ApiError(msg="Could not get entities of the contribution.")


@router.put(
    "{id_entity_origin_persistent}/duplicate",
    response={200: PutDuplicateResponse, 401: ApiError, 404: ApiError, 500: ApiError},
)
def put_duplicate_assignment(
    request: HttpRequest, id_entity_origin_persistent: str, body: PutDuplicateRequest
):
    "API method for assigning duplicates."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")

    id_contribution_persistent = request.resolver_match.captured_kwargs[
        "id_contribution_persistent"
    ]
    id_entity_destination_persistent = body.id_entity_destination_persistent

    try:
        candidate = ContributionCandidate.by_id_persistent(
            id_contribution_persistent, user
        ).get()
        # Check wether entities actually exist
        origin = Entity.most_recent_by_id(id_entity_origin_persistent)
        if origin.contribution_candidate != candidate:
            return 400, ApiError(msg="Origin Entity does not belong to contribution.")
        if id_entity_destination_persistent:
            destination = Entity.most_recent_by_id(id_entity_destination_persistent)
            assigned_duplicate = person_db_to_api(destination)
        else:
            assigned_duplicate = None
        with transaction.atomic():
            # Delete existing duplicate
            EntityDuplicate.objects.filter(  # pylint: disable=no-member
                id_origin_persistent=id_entity_origin_persistent
            ).delete()
            if id_entity_destination_persistent:
                EntityDuplicate.objects.create(  # pylint: disable=no-member
                    id_origin_persistent=origin.id_persistent,
                    id_destination_persistent=destination.id_persistent,
                    contribution_candidate=candidate,
                )
            return 200, PutDuplicateResponse(assigned_duplicate=assigned_duplicate)

    except IndexError:
        return 404, ApiError(msg="One of the entities does not exist.")
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning("", exc_info=exc)
        return 500, ApiError(
            msg="Could not assign entity duplicates for the contribution."
        )


def scored_match_db_to_api(match):
    "Converts an entity annotated with a similarity score to a scored match"
    return ScoredMatch(
        similarity=match["similarity"],
        entity=PersonNatural(
            id_persistent=match["id_persistent"],
            display_txt=match["display_txt"],
            version=match["id"],
        ),
    )
