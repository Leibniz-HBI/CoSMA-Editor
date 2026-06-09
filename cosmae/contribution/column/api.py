"API endpoints for managing columns of new contributions."

from logging import getLogger
from typing import List

from django.db import DatabaseError
from django.http import HttpRequest
from ninja import Path, Router, Schema

from cosmae.column.models_django import Column
from cosmae.contribution.column.models_django import (
    ColumnContribution as ColumnContributionDb,
)
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)
from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.util.auth import check_user
from cosmae.util.django import patch_from_dict

router = Router()
_LOGGER = getLogger(__name__)


class ColumnContribution(Schema):
    "Response Schema for contribution columns."

    # pylint: disable=too-few-public-methods
    name: str
    id_persistent: str
    id_existing_persistent: str | None = None
    index_in_file: int
    discard: bool


class ColumnContributionResponseList(Schema):
    "Response schema for multiple contribution columns"

    # pylint: disable=too-few-public-methods
    column_list: List[ColumnContribution]


class ColumnPatchRequest(Schema):
    "Request for updating a contribution column"

    # pylint: disable=too-few-public-methods
    id_existing_persistent: str | None = None
    discard: bool | None = None


@router.get(
    "",
    response={
        200: ColumnContributionResponseList,
        404: ApiError,
        401: ApiError,
        500: ApiError,
        400: ApiError,
    },
)
def get_columns(request: HttpRequest, id_contribution_persistent: str = Path(...)):
    "API method for getting columns of a contribution candidate."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
        try:
            candidate = ContributionCandidateDb.by_id_persistent(
                id_contribution_persistent, user
            ).get()
        except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Contribution candidate does not exist.")
        if candidate.state == ContributionCandidateDb.UPLOADED:
            return 400, ApiError(msg="Column definitions not yet extracted.")
        columns_db = ColumnContributionDb.get_by_candidate_query_set(
            candidate
        ).order_by("index_in_file")
        if not columns_db:
            return 404, ApiError(msg="No columns match the given parameters.")
        return 200, ColumnContributionResponseList(
            column_list=[
                columns_contribution_db_to_api(column) for column in columns_db
            ],
        )
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError:
        return 500, ApiError(msg="Could not get the columns from the database.")
    except Exception:  # pylint: disable=broad-except
        return 500, ApiError(msg="Could not get the requested columns.")


allowed_additional_fields = {"display_txt", "id_persistent", "justification"}


@router.patch(
    "{id_persistent}",
    response={
        200: ColumnContribution,
        400: ApiError,
        401: ApiError,
        404: ApiError,
        500: ApiError,
    },
)
def patch_column(
    request: HttpRequest,
    id_persistent: str,
    patch_data: ColumnPatchRequest,
    id_contribution_persistent: str = Path(...),
):
    "API method for updating a column of a contribution."
    # pylint: disable=too-many-return-statements
    try:
        user = check_user(request)
        try:
            contribution = ContributionCandidateDb.by_id_persistent(
                id_contribution_persistent, user
            ).get()
            if contribution.state != ContributionCandidateDb.COLUMNS_EXTRACTED:
                return 400, ApiError(
                    msg="You can only change column assignments,"
                    ' when the contribution state is "COLUMNS_EXTRACTED".'
                )
            candidate_definition = ColumnContributionDb.get_by_id_persistent(
                id_persistent, contribution
            )
            patch_dict = patch_data.model_dump(exclude_unset=True)
            id_existing_persistent = patch_dict.get("id_existing_persistent")
            if id_existing_persistent is not None:
                if id_existing_persistent not in allowed_additional_fields:
                    Column.most_recent_by_id(id_existing_persistent)
                patch_dict["discard"] = False
            elif "discard" not in patch_dict:
                patch_dict["discard"] = True
            if patch_dict.get("discard"):
                patch_dict["id_existing_persistent"] = None
            patch_from_dict(candidate_definition, **patch_dict)
            return 200, columns_contribution_db_to_api(candidate_definition)
        except Column.DoesNotExist:  # pylint: disable=no-member
            return 400, ApiError(msg="Existing column does not exist.")
        except ContributionCandidateDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Contribution candidate does not exist.")
        except ColumnContributionDb.DoesNotExist:  # pylint: disable=no-member
            return 404, ApiError(msg="Column does not exist.")
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated.")
    except DatabaseError:
        return 500, ApiError(msg="Could not update the column from the database.")
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Could not update the requested column."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


def columns_contribution_db_to_api(column_db: ColumnContribution):
    "Convert a contribution column from API to database representation."
    return ColumnContribution(
        name=column_db.name,
        id_persistent=str(column_db.id_persistent),
        id_existing_persistent=column_db.id_existing_persistent,
        index_in_file=column_db.index_in_file,
        discard=column_db.discard,
    )
