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


def post_chunk(url, offset, limit, cookies=None):
    return requests.post(
        urljoin(url, "cosmae/api/persons/chunk"),
        json={"offset": offset, "limit": limit},
        cookies=cookies,
        timeout=9,
    )


def put_justification(url, id_entity_persistent, text, cookies=None):
    return requests.put(
        urljoin(
            url,
            f"cosmae/api/persons/{id_entity_persistent}/justifications",
        ),
        json={"justification_txt": text},
        cookies=cookies,
        timeout=9,
    )


def get_justification(url, id_entity_persistent, cookies=None):
    return requests.get(
        urljoin(
            url,
            f"cosmae/api/persons/{id_entity_persistent}/justifications",
        ),
        cookies=cookies,
        timeout=9,
    )


def get_entity_details(url, id_entity_persistent, cookies=None):
    return requests.get(
        url + "/cosmae/api/persons/details?id_persistent=" + id_entity_persistent,
        cookies=cookies,
        timeout=900,
    )
