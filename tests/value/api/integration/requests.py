"Requests for testing the value API"

from urllib.parse import urljoin

import requests


def post_value_list(url, value_list, cookies=None):
    "Post request for setting values"
    return requests.post(
        urljoin(url, "/cosmae/api/values"),
        json={"value_list": value_list},
        cookies=cookies,
        timeout=900,
    )


def post_value(url, value, **kwargs):
    "Post request for setting a single value"
    return post_value_list(url, [value], **kwargs)


def post_value_chunks(url, column_id, offset, limit, cookies=None):
    "Post request for getting a chunk of values"
    return requests.post(
        urljoin(url, "/cosmae/api/values/chunk"),
        json={
            "id_column_persistent": column_id,
            "offset": offset,
            "limit": limit,
        },
        cookies=cookies,
        timeout=900,
    )


def post_value_value_list(url, id_persistent_pairs, cookies):
    "Post request for getting values for a list entity-column id pairs"
    return requests.post(
        urljoin(url, "cosmae/api/values/values"),
        json={
            "value_requests": [
                {
                    "id_entity_persistent": id_entity_persistent,
                    "id_column_persistent": id_column_persistent,
                }
                for id_entity_persistent, id_column_persistent in id_persistent_pairs
            ]
        },
        cookies=cookies,
        timeout=900,
    )


def post_value_value(url, id_entity_persistent, id_column_persistent, cookies=None):
    "Post request for getting values for a single entity-column id pair"
    return post_value_value_list(
        url, [(id_entity_persistent, id_column_persistent)], cookies
    )


def post_values_for_entities(  # pylint: disable=too-many-arguments, too-many-positional-arguments
    url,
    id_entity_persistent_list,
    id_column_persistent_list,
    id_contribution_persistent=None,
    id_merge_request_persistent=None,
    cookies=None,
):
    """Get values for entity column pairs, including ones
    that are associated by merge requests or contributions."""
    return requests.post(
        urljoin(url, "cosmae/api/values/entities"),
        json={
            "id_column_persistent_list": id_column_persistent_list,
            "id_entity_persistent_list": id_entity_persistent_list,
            "id_contribution_persistent": id_contribution_persistent,
            "id_merge_request_persistent": id_merge_request_persistent,
        },
        cookies=cookies,
        timeout=900,
    )
