# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_tag_definition(url, id_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/contributions/{id_persistent}/tags",
        cookies=cookies,
        timeout=900,
    )
