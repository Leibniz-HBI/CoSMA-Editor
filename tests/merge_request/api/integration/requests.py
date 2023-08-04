# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_merge_requests(url, cookies=None):
    return requests.get(url + "/cosmae/api/merge_requests", cookies=cookies, timeout=900)


def get_conflicts(url, id_merge_request_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/merge_requests/{id_merge_request_persistent}/conflicts",
        cookies=cookies,
        timeout=900,
    )
