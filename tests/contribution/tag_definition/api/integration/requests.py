# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_column(url, id_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/contributions/{id_persistent}/columns",
        cookies=cookies,
        timeout=900,
    )


def patch_column(
    url, id_persistent_contribution, id_persistent_column, patch_data, cookies=None
):
    return requests.patch(
        url + "/cosmae/api/contributions/"
        f"{id_persistent_contribution}/columns/{id_persistent_column}",
        cookies=cookies,
        timeout=900,
        json=patch_data,
    )
