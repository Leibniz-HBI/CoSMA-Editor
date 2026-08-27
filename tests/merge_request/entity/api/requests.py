"Test methods for accessing entity merge request API endpoints."

from cosmae.merge_request.entity.api import get_merge_request_conflicts


def get_conflicts(request, id_merge_request, offset=0, limit=10):
    "Get conflicts for API tests."
    return get_merge_request_conflicts(request, id_merge_request, offset, limit)
