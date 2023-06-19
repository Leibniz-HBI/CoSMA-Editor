# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def post_contribution(url, contribution, cookies=None, content_type="text/csv"):
    return requests.post(
        url + "/cosmae/api/contributions",
        data=contribution,
        files={
            "file": ("empty.csv", open("tests/files/empty.csv", "rb"), content_type)
        },
        cookies=cookies,
        timeout=900,
    )


def get_contribution(url, id_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/contributions/{id_persistent}", cookies=cookies, timeout=900
    )


def get_chunk(url, offset, limit, cookies=None):
    return requests.get(
        url + f"/cosmae/api/contributions/chunk/{offset}/{limit}",
        cookies=cookies,
        timeout=900,
    )


def patch_contribution(url, id_persistent, patch_data, cookies=None):
    return requests.patch(
        url + f"/cosmae/api/contributions/{id_persistent}",
        json=patch_data,
        cookies=cookies,
        timeout=900,
    )


def post_column_assignment_complete(url, id_persistent, cookies=None):
    return requests.post(
        url + f"/cosmae/api/contributions/{id_persistent}/column_assignment_complete",
        cookies=cookies,
        timeout=900,
    )
