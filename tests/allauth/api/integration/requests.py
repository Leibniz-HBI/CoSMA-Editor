# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

from urllib.parse import urljoin

import requests


def post_login(url, username, password, cookies=None):
    json = {"username": username, "password": password}
    headers = {}
    csrf_token = cookies.get("csrftoken")
    if csrf_token is not None:
        headers["X-CSRFToken"] = csrf_token
    return requests.post(
        urljoin(url, "/_allauth/browser/v1/auth/login"),
        json=json,
        headers=headers,
        cookies=cookies,
        timeout=900,
    )


def get_session(url, cookies=None):
    return requests.get(
        urljoin(url, "_allauth/browser/v1/auth/session"), cookies=cookies, timeout=900
    )


def get_config(url, cookies=None):
    return requests.get(
        url + "/_allauth/browser/v1/config", cookies=cookies, timeout=900
    )


def post_register(
    url, registration, cookies=None
):  # pylint: disable=dangerous-default-value
    csrf_token = cookies.get("csrftoken")
    headers = {}
    csrf_token = cookies.get("csrftoken")
    if csrf_token is not None:
        headers["X-CSRFToken"] = csrf_token
    return requests.post(
        urljoin(url, "/_allauth/browser/v1/auth/signup"),
        json=registration,
        headers=headers,
        cookies=cookies,
        timeout=900,
    )
