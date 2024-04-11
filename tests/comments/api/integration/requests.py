# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_comments(url, id_persistent_list, cookies=None):
    return requests.post(
        url + "/cosmae/api/comments",
        json={"id_persistent_list": id_persistent_list},
        cookies=cookies,
        timeout=900,
    )


def post_comments(url, id_persistent, comment, cookies=None):
    return requests.post(
        url + f"/cosmae/api/comments/{id_persistent}",
        json={"comment": {"content": comment}},
        cookies=cookies,
        timeout=900,
    )
