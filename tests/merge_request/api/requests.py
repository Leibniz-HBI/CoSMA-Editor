"Requests for merge request API tests."

from cosmae.merge_request.api import get_merge_request_conflicts, put_merge_request


def get_conflicts(request, id_merge_request_persistent, offset=0, limit=10):
    "Call API method fro retrieving conflicts."
    return get_merge_request_conflicts(
        request,
        id_merge_request_persistent=id_merge_request_persistent,
        offset=offset,
        limit=limit,
    )


def create_merge_request(request, id_origin_persistent, id_destination_persistent):
    "Call API method for creating a merge request."
    return put_merge_request(
        request,
        id_origin_persistent=id_origin_persistent,
        id_destination_persistent=id_destination_persistent,
    )
