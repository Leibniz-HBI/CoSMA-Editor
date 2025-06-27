"API methods for entities of a contribution"

import logging
from typing import Dict, List
from uuid import uuid4

from django.db import transaction
from django.db.models import Q
from django.http import HttpRequest
from ninja import Router, Schema

from cosmae.contribution.entity.match_entities import (
    find_matches,
    single_pair_similarity,
)
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.api import (
    Entity,
    EntityWithJustificationList,
    entity_db_dict_to_api,
    entity_db_to_api,
)
from cosmae.entity.models_django import Entity as EntityDb
from cosmae.entity.models_django import EntityJustification, entity_objects
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.util import CosmaeUser, timestamp
from cosmae.util.auth import check_user

router = Router()


class ScoredMatch(Schema):
    "API model for combining an entity with a similarity score"

    # pylint: disable=too-few-public-methods
    similarity: float
    id_match_column_persistent_list: List[str]
    entity: Entity


class ScoredMatchesWithDuplicateAssignment(Schema):
    "API model for combining scored matches with the id of a selected duplicate"

    # pylint: disable=too-few-public-methods
    matches: List[ScoredMatch]
    assigned_duplicate: ScoredMatch | None = None


class ScoredMatchResponse(Schema):
    "API model for multiple scored matches"

    # pylint: disable=too-few-public-methods
    matches: Dict[str, ScoredMatchesWithDuplicateAssignment]


class PostSimilarRequest(Schema):
    "API model for requesting similar entities."

    # pylint: disable=too-few-public-methods
    id_entity_persistent_list: List[str]


class PutDuplicateRequest(Schema):
    "API model for requesting similar entities."

    # pylint: disable=too-few-public-methods
    id_entity_destination_persistent: str | None = None
    justification_txt: str | None = None
    keep_justification_for_all: bool | None = None


class PutDuplicateResponse(Schema):
    "API Response for put duplicate request"

    # pylint: disable=too-few-public-methods
    assigned_duplicate: ScoredMatch | None = None


empty_match = ScoredMatchesWithDuplicateAssignment(assigned_duplicate=None, matches=[])


@router.get(
    "chunk/{start}/{offset}",
    response={
        200: EntityWithJustificationList,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
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
        entities_db = EntityJustification.annotate_justification(
            candidate.get_entities_chunked(start, offset)
        )
        return 200, EntityWithJustificationList(
            entity_list=[entity_db_to_api(person) for person in entities_db]
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
    # pylint: disable=too-many-return-statements
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
        if not similar_request.id_entity_persistent_list:
            return 200, ScoredMatchResponse(matches={})
        entity_query_set = (
            entity_objects()
            .exclude_disabled()
            .filter(id_persistent__in=similar_request.id_entity_persistent_list)
        )
        if not entity_query_set or entity_query_set.filter(
            ~Q(contribution_candidate_id=candidate.id_persistent)
        ):
            return 404, ApiError(
                msg="Some entities are not part of the contribution candidate."
            )
        matches = find_matches(
            candidate.id_persistent, similar_request.id_entity_persistent_list
        )
        scored_matches = matches_db_to_api(matches, candidate)
        for id_persistent in similar_request.id_entity_persistent_list:
            if id_persistent not in scored_matches:
                scored_matches[id_persistent] = empty_match
        return 200, ScoredMatchResponse(matches=scored_matches)
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except IndexError:  # pylint: disable=no-member
        return 404, ApiError(msg="Entity does not exist.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        return 500, ApiError(msg="Could not get entities of the contribution.")


@router.get(
    "score",
    response={
        200: ScoredMatch,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def get_score(
    request: HttpRequest,
    id_entity_contribution_persistent,
    id_entity_existing_persistent,
):
    "API method for getting existing entities similar to contributed ones"
    # pylint: disable=too-many-return-statements
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
        try:
            entity_contribution = EntityDb.most_recent_by_id(
                id_entity_contribution_persistent
            )
            if (
                not entity_contribution.contribution_candidate_id
                == candidate.id_persistent
            ):
                return 400, ApiError(msg="Entity is not part of the contribution.")
        except EntityDb.DoesNotExist:
            return 404, ApiError(msg="Contributed entity does not exist.")
        try:
            entity_existing = EntityDb.most_recent_by_id(id_entity_existing_persistent)
            if entity_existing.contribution_candidate_id is not None:
                return 400, ApiError(msg="Existing entity is not curated.")
        except EntityDb.DoesNotExist:
            return 404, ApiError(msg="No such existing entity.")
        matches = single_pair_similarity(
            candidate.id_persistent,
            id_entity_contribution_persistent,
            id_entity_existing_persistent,
        )
        scored_match = scored_match_db_to_api(matches[0].matches[0])
        return 200, scored_match
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except IndexError:  # pylint: disable=no-member
        return 404, ApiError(msg="Entity does not exist.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        return 500, ApiError(msg="Could not get entities of the contribution.")


def scored_match_from_assigned_duplicate(assigned_duplicate, candidate, origin):
    "Get similarity scores for an assigned duplicate"
    if assigned_duplicate is not None:
        matches = single_pair_similarity(
            candidate.id_persistent,
            origin.id_persistent,
            assigned_duplicate.id_persistent,
        )
        scored_match = scored_match_db_to_api(matches[0].matches[0])
    else:
        scored_match = None
    return scored_match


@router.put(
    "{id_entity_origin_persistent}/duplicate",
    response={
        200: PutDuplicateResponse,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def put_duplicate_assignment(
    request: HttpRequest, id_entity_origin_persistent: str, body: PutDuplicateRequest
):  # pylint: disable=too-many-return-statements
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
        origin = EntityDb.most_recent_by_id(id_entity_origin_persistent)
        if origin.contribution_candidate != candidate:
            return 400, ApiError(msg="Origin Entity does not belong to contribution.")
        if id_entity_destination_persistent:
            destination = EntityJustification.annotate_justification(
                EntityDb.most_recent_by_id_queryset(id_entity_destination_persistent)
            ).get()
            assigned_duplicate = entity_db_to_api(destination)
            if body.justification_txt is not None:
                add_justification(
                    candidate,
                    id_entity_origin_persistent,
                    body.justification_txt,
                    user,
                    body.keep_justification_for_all,
                )
        else:
            assigned_duplicate = None
            try:
                handle_justification_no_duplicate(
                    candidate,
                    id_entity_origin_persistent,
                    body.justification_txt,
                    body.keep_justification_for_all,
                    user,
                )
            except EntityJustification.EmptyJustificationException:
                return 400, ApiError(msg="Justification can not be empty.")
            except EntityJustification.NoJustificationException:
                return 400, ApiError(msg="Entity justification required.")

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
            scored_match = scored_match_from_assigned_duplicate(
                assigned_duplicate, candidate, origin
            )
            return 200, PutDuplicateResponse(assigned_duplicate=scored_match)

    except EntityDb.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="One of the entities does not exist.")
    except ContributionCandidate.DoesNotExist:  # pylint: disable=no-member
        return 404, ApiError(msg="Contribution candidate does not exist.")
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning("", exc_info=exc)
        return 500, ApiError(
            msg="Could not assign entity duplicates for the contribution."
        )


def handle_justification_no_duplicate(
    candidate: ContributionCandidate,
    id_entity_origin_persistent: str,
    justification_txt: str,
    keep_justification_for_all: bool,
    user: CosmaeUser,
):
    "Handle adding of justification if there is no duplicate assigned."
    if justification_txt is not None:
        add_justification(
            candidate,
            id_entity_origin_persistent,
            justification_txt,
            user,
            keep_justification_for_all,
        )
    else:
        if candidate.justification is None:
            justification_qs = EntityJustification.for_id_entity_persistent_unordered(
                id_entity_origin_persistent
            )
            if len(justification_qs) == 0:
                raise EntityJustification.NoJustificationException()
        else:
            add_justification(
                candidate,
                id_entity_origin_persistent,
                candidate.justification,
                user,
                keep_justification_for_all,
            )


def add_justification(
    candidate,
    id_entity_origin_persistent,
    justification,
    user,
    keep_justification_for_all,
):
    "Add an entity justification."
    EntityJustification.add(
        id_persistent=uuid4(),
        id_entity_persistent=id_entity_origin_persistent,
        text=justification,
        timestamp=timestamp(),
        author=user,
    )
    if keep_justification_for_all:
        candidate.justification = justification
        candidate.save()


def scored_match_db_to_api(match):
    "Converts an entity annotated with a similarity score to a scored match"
    id_match_column_persistent_list = match["equal_column_list"]
    if id_match_column_persistent_list is None:
        id_match_column_persistent_list = []
    return ScoredMatch(
        similarity=match["levenshtein_similarity"],
        entity=entity_db_dict_to_api(match),
        id_match_column_persistent_list=id_match_column_persistent_list,
    )


def matches_db_to_api(matches, candidate):
    "Convert matches found by DB query to API map."
    scored_matches = {}
    for entity in matches:
        assigned_duplicate = None
        id_assigned_duplicate = None
        if entity.assigned_duplicate is not None:
            id_assigned_duplicate = entity.assigned_duplicate["id_persistent"]
        matches_api = []
        for match in entity.matches:
            match_api = scored_match_db_to_api(match)
            matches_api.append(match_api)
            if match["id_persistent"] == id_assigned_duplicate:
                assigned_duplicate = match_api
        if assigned_duplicate is None:
            if id_assigned_duplicate is not None:
                duplicate_matches = single_pair_similarity(
                    candidate.id_persistent,
                    entity.id_persistent,
                    id_assigned_duplicate,
                )
                scored_match = scored_match_db_to_api(duplicate_matches[0].matches[0])
                matches_api.insert(0, scored_match)
                assigned_duplicate = scored_match
        scored_matches[entity.id_persistent] = ScoredMatchesWithDuplicateAssignment(
            assigned_duplicate=assigned_duplicate, matches=matches_api
        )
    return scored_matches
