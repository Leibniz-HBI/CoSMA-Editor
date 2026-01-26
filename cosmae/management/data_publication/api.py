"""API methods for managing datasets."""

from datetime import datetime
from logging import getLogger
from typing import Literal

from django.db import transaction
from django.db.models import TextField
from django.db.models.functions import Cast
from django.http import HttpRequest, HttpResponse
from ninja import Router, Schema

from cosmae.exception import ApiError, NotAuthenticatedException
from cosmae.management.data_publication.models_django import (
    DataPublication as DataPublicationDb,
)
from cosmae.management.data_publication.models_django import (
    DataPublicationStepInput,
)
from cosmae.util import CosmaeUser
from cosmae.util.auth import check_user
from cosmae.util.response import EmptyResponse

router = Router()

_LOGGER = getLogger(__name__)


class DataPublicationMetadataPutRequest(Schema):
    "API model for creating a new dataset publication."

    name: str
    start_time: datetime | None = None
    end_time: datetime


class DataPublicationMetadata(Schema):
    "Metadata for a dataset publication."

    id_persistent: str
    name: str
    start_time: datetime
    end_time: datetime
    step: Literal[
        "Created",
        "DisplayText",
        "Justification",
        "Curated",
        "User",
        "Authors",
        "Completed",
    ]
    error: str | None
    error_details: str | None
    is_working: bool


class DataPublicationMetadataList(Schema):
    "API model for a list of dataset publication metadata."

    metadata_list: list[DataPublicationMetadata]


@router.get(
    "",
    response={
        200: DataPublicationMetadataList,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def get_data_publication_metadata(request: HttpRequest):
    """Get metadata for all dataset publications."""
    # Placeholder implementation
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Forbidden")
    publication_queryset = DataPublicationDb.objects.all()
    try:
        return 200, DataPublicationMetadataList(
            metadata_list=[
                data_publication_db_to_api(pub) for pub in publication_queryset
            ]
        )
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Failed to get dataset publication metadata."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


@router.put(
    "",
    response={
        200: DataPublicationMetadata,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        500: ApiError,
    },
)
def put_data_publication_metadata(
    request: HttpRequest, metadata: DataPublicationMetadataPutRequest
):
    """API endpoint to create a new dataset publication."""
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Forbidden")
    start_time = metadata.start_time
    if start_time is None:
        start_time = datetime.min
    elif metadata.start_time >= metadata.end_time:
        return 400, ApiError(
            msg="Invalid time range: start_time must be before end_time."
        )
    try:
        dataset_publication = DataPublicationDb.create(
            name=metadata.name,
            start_time=start_time,
            end_time=metadata.end_time,
        )
        return 200, data_publication_db_to_api(dataset_publication)
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Failed to create dataset publication."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


@router.get(
    "/{id_publication}/results",
    response={
        200: str,
        400: ApiError,
        401: ApiError,
        403: ApiError,
        404: ApiError,
    },
)
def get_data_publication_results(request: HttpRequest, id_publication: str):
    "API method to get dataset publication results."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Forbidden")
    try:
        publication = (
            DataPublicationStepInput.objects.filter(
                publication_id=id_publication,
                step=DataPublicationDb.Step.PROCESSING_COMPLETED,
            )
            .annotate(input_str=Cast("input", output_field=TextField()))
            .values("input_str")
            .get()
        )
        response = HttpResponse(
            content=str(publication["input_str"]),
            headers={
                "Content-Type": "application/json",
                "Content-Disposition": 'attachment; filename="results.json"',
            },
        )
        return response
    except DataPublicationStepInput.DoesNotExist:
        return 404, ApiError(msg="Results for dataset publication not found.")
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Failed to get dataset publication results."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


@router.delete(
    "/{id_publication}",
    response={200: EmptyResponse, 401: ApiError, 403: ApiError, 404: ApiError},
)
def delete_data_publication_metadata(request: HttpRequest, id_publication: str):
    "API method to delete a dataset publication."
    try:
        user = check_user(request)
    except NotAuthenticatedException:
        return 401, ApiError(msg="Not authenticated")
    user = check_user(request)
    if user.permission_group != CosmaeUser.COMMISSIONER:
        return 403, ApiError(msg="Forbidden")
    try:
        with transaction.atomic():
            publication = DataPublicationDb.objects.filter(  # pylint: disable=no-member
                id_persistent=id_publication
            ).get()
            DataPublicationStepInput.objects.filter(  # pylint: disable=no-member
                publication=publication
            ).delete()
            publication.delete()
            return 200, EmptyResponse()
    except DataPublicationDb.DoesNotExist:
        return 404, ApiError(msg="Dataset publication not found.")
    except Exception as exc:  # pylint: disable=broad-except
        msg = "Failed to get dataset publication results."
        _LOGGER.error(msg, exc_info=exc)
        return 500, ApiError(msg=msg)


def data_publication_db_to_api(dataset_publication):
    "Convert a DatasetPublication from DB to API representation."
    return DataPublicationMetadata(
        id_persistent=dataset_publication.id_persistent,
        name=dataset_publication.name,
        start_time=dataset_publication.start_time,
        end_time=dataset_publication.end_time,
        step=DATA_PUBLICATION_STEP_DB_TO_API[dataset_publication.step],
        error=dataset_publication.error_message,
        error_details=dataset_publication.error_details,
        is_working=dataset_publication.is_working,
    )


DATA_PUBLICATION_STEP_DB_TO_API = {
    DataPublicationDb.Step.CREATED: "Created",
    DataPublicationDb.Step.DISPLAY_TXT: "DisplayText",
    DataPublicationDb.Step.JUSTIFICATION: "Justification",
    DataPublicationDb.Step.CURATED: "Curated",
    DataPublicationDb.Step.USER: "User",
    DataPublicationDb.Step.AUTHORS: "Authors",
    DataPublicationDb.Step.PROCESSING_COMPLETED: "Completed",
}
