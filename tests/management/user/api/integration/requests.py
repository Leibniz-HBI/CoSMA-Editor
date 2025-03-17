# pylint: disable=missing-module-docstring

import requests


def post_create_user(url, registration, cookies=None):
    "Perform request creating a new user"
    return requests.post(
        url + "/cosmae/api/manage/user",
        json=registration,
        timeout=900,
        cookies=cookies,
    )
