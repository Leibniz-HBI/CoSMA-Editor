"Requests for testing data publication API methods."

from datetime import datetime

from django.http import HttpRequest

import cosmae.management.data_publication.api as data_publication_api


def put_data_publication(
    request: HttpRequest,
    start_time: datetime,
    end_time: datetime,
    name: str | None = None,
):
    """Test method for filtering entities via the API."""
    return data_publication_api.put_data_publication_metadata(
        request,
        data_publication_api.DataPublicationMetadataPutRequest(
            name=name, start_time=start_time, end_time=end_time
        ),
    )


def get_data_publication_list(
    request: HttpRequest,
):
    """Test method for filtering entities via the API."""
    return data_publication_api.get_data_publication_metadata(
        request,
    )


def get_data_publication_results(request: HttpRequest, id_publication: str):
    """Test method for getting data publication results via the API."""
    return data_publication_api.get_data_publication_results(
        request,
        id_publication,
    )
