# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from urllib.parse import urljoin

import requests


def post_person(url, person):
    return post_persons(url, [person])


def post_persons(url, persons):
    return requests.post(
        urljoin(url, "/cosmae/api/persons"), json={"persons": persons}, timeout=9
    )


def get_count(url):
    return requests.get(
        urljoin(url, "/cosmae/api/persons/count"),
        # headers={"Content-Type": "application/json"},
        timeout=9,
    )


def post_chunk(url, offset, limit):
    return requests.post(
        urljoin(url, "cosmae/api/persons/chunk"),
        json={"offset": offset, "limit": limit},
        timeout=9,
    )
