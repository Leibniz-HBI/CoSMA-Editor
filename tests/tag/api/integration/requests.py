# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,too-many-arguments,too-many-positional-arguments
from urllib.parse import urljoin

import requests


def post_column(url, column, cookies=None):
    return post_column_list(url, [column], cookies)


def post_column_list(url, column_list, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/columns"),
        json={"column_list": column_list},
        cookies=cookies,
        timeout=900,
    )


def get_columns(url, cookies=None):
    return requests.get(
        urljoin(url, "/cosmae/api/columns"),
        cookies=cookies,
        timeout=900,
    )


def post_value(url, value, **kwargs):
    return post_value_list(url, [value], **kwargs)


def post_value_list(url, value_list, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/values"),
        json={"value_list": value_list},
        cookies=cookies,
        timeout=900,
    )


def post_value_chunks(url, column_id, offset, limit, cookies=None):
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


def post_column_children(url, id_persistent, cookies=None):
    return requests.post(
        urljoin(url, "cosmae/api/columns/children"),
        json={"id_parent_persistent": id_persistent},
        timeout=900,
        cookies=cookies,
    )


def post_value_value(url, id_entity_persistent, id_column_persistent, cookies=None):
    return post_value_value_list(
        url, [(id_entity_persistent, id_column_persistent)], cookies
    )


def post_value_value_list(url, id_persistent_pairs, cookies):
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


def post_values_for_entities(
    url,
    id_entity_persistent_list,
    id_column_persistent_list,
    id_contribution_persistent=None,
    id_merge_request_persistent=None,
    cookies=None,
):
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


def post_curation(url, id_column_persistent, cookies=None):
    return requests.post(
        url + f"/cosmae/api/columns/permissions/{id_column_persistent}/curate",
        cookies=cookies,
        timeout=900,
    )


def post_owner(url, id_column_persistent, id_user_persistent, cookies=None):
    return requests.post(
        url + "/cosmae/api/columns/permissions/"
        f"{id_column_persistent}/owner/{id_user_persistent}",
        cookies=cookies,
        timeout=900,
    )


def post_accept(url, id_request_persistent, cookies=None):
    return requests.post(
        url + "/cosmae/api/columns/permissions/owner/"
        f"{id_request_persistent}/accept",
        cookies=cookies,
        timeout=900,
    )


def get_ownership_requests(url, cookies=None):
    return requests.get(
        url + "/cosmae/api/columns/permissions/ownership_requests",
        cookies=cookies,
        timeout=900,
    )


def delete_ownership(url, id_request_persistent, cookies=None):
    return requests.delete(
        url + "/cosmae/api/columns/permissions/owner/" f"{id_request_persistent}",
        cookies=cookies,
        timeout=900,
    )


def post_details(url, id_persistent_list, cookies=None):
    return requests.post(
        url + "/cosmae/api/columns/details",
        json={"id_persistent_list": id_persistent_list},
        cookies=cookies,
        timeout=900,
    )


def purge_column(url, id_column_persistent, cookies=None):
    return requests.delete(
        url + f"/cosmae/api/columns/{id_column_persistent}",
        cookies=cookies,
        timeout=900,
    )


def get_descendants(url, id_column_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/columns/{id_column_persistent}/descendants",
        cookies=cookies,
        timeout=900,
    )
