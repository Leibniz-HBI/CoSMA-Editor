# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def post_contribution(url, contribution_data, cookies=None):
    return requests.post(
        url + "/cosmae/api/contributions",
        data=contribution_data,
        files={"file": ("empty.csv", open("tests/files/empty.csv", "rb"), "text/csv")},
        cookies=cookies,
        timeout=900,
    )


def get_column(url, id_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/contributions/{id_persistent}/columns",
        cookies=cookies,
        timeout=900,
    )
