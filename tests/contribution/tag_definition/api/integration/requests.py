# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_tag_definition(url, id_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/contributions/{id_persistent}/tags",
        cookies=cookies,
        timeout=900,
    )


def patch_tag_definition(
    url, id_persistent_contribution, id_persistent_tag, patch_data, cookies=None
):
    return requests.patch(
        url + "/cosmae/api/contributions/"
        f"{id_persistent_contribution}/tags/{id_persistent_tag}",
        cookies=cookies,
        timeout=900,
        json=patch_data,
    )
