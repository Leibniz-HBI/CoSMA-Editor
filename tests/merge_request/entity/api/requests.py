"Test methods for accessing entity merge request API endpoints."

from cosmae.merge_request.entity.api import (
    EntityMergeRequestPatchRequest,
    get_merge_request_conflicts,
)
from cosmae.merge_request.entity.api import (
    patch_merge_request as patch_merge_request_api,
)


def get_conflicts(request, id_merge_request, offset=0, limit=10):
    "Get conflicts for API tests."
    return get_merge_request_conflicts(request, id_merge_request, offset, limit)


def patch_merge_request(request, id_merge_request):
    "Change entity merge request for API tests."
    return patch_merge_request_api(
        request, id_merge_request, EntityMergeRequestPatchRequest(state="CLOSED")
    )
