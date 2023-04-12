# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from urllib.parse import urljoin

import requests


def post_person(url, person, **kwargs):
    return post_persons(url, [person], **kwargs)


def post_persons(url, persons, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/persons"),
        json={"persons": persons},
        cookies=cookies,
        timeout=9,
    )


def get_count(url, cookies=None):
    return requests.get(
        urljoin(url, "/cosmae/api/persons/count"),
        # headers={"Content-Type": "application/json"},
        cookies=cookies,
        timeout=9,
    )


def post_chunk(url, offset, limit, cookies=None):
    return requests.post(
        urljoin(url, "cosmae/api/persons/chunk"),
        json={"offset": offset, "limit": limit},
        cookies=cookies,
        timeout=9,
    )
