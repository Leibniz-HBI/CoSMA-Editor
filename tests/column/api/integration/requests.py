# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,too-many-arguments,too-many-positional-arguments
from datetime import datetime
from urllib.parse import urljoin

import requests

from tests.utils import format_datetime_request


def post_column(url, column, cookies=None):
    return post_column_list(url, [column], cookies)


def post_column_list(url, column_list, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/columns"),
        json={"column_list": column_list},
        cookies=cookies,
        timeout=900,
    )


def post_column_children(
    url, id_persistent, up_until_time: datetime | None = None, cookies=None
):
    body = {"id_parent_persistent": id_persistent}
    if up_until_time is not None:
        body["up_until_time"] = format_datetime_request(up_until_time)
    return requests.post(
        urljoin(url, "cosmae/api/columns/children"),
        json=body,
        timeout=900,
        cookies=cookies,
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


def post_details(
    url, id_persistent_list, up_until_time: datetime | None = None, cookies=None
):
    body = {"id_persistent_list": id_persistent_list}
    if up_until_time is not None:
        body["up_until_time"] = format_datetime_request(up_until_time)
    return requests.post(
        url + "/cosmae/api/columns/details",
        json=body,
        cookies=cookies,
        timeout=900,
    )


def purge_column(url, id_column_persistent, cookies=None):
    return requests.delete(
        url + f"/cosmae/api/columns/{id_column_persistent}",
        cookies=cookies,
        timeout=900,
    )


def get_descendants(
    url, id_column_persistent, up_until_time: datetime | None = None, cookies=None
):
    req_pth = url + f"/cosmae/api/columns/{id_column_persistent}/descendants?"
    if up_until_time is not None:
        req_pth += f"up_until_time={format_datetime_request(up_until_time)}"
    return requests.get(
        req_pth,
        cookies=cookies,
        timeout=900,
    )
