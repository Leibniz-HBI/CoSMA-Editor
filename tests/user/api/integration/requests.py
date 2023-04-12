# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

from urllib.parse import urljoin

import requests


def post_register(url, registration):  # pylint: disable=dangerous-default-value
    return requests.post(
        urljoin(url, "/cosmae/api/user/register"), json=registration, timeout=900
    )


def post_login(url, login):
    return requests.post(urljoin(url, "/cosmae/api/user/login"), json=login, timeout=900)


def get_refresh(url, cookies=None):
    return requests.get(
        urljoin(url, "/cosmae/api/user/refresh"), cookies=cookies, timeout=900
    )
