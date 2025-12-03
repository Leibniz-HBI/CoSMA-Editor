# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from urllib.parse import urljoin

import requests

from tests.utils import format_datetime_request


def post_person(url, person, **kwargs):
    return post_persons(url, [person], **kwargs)


def post_persons(url, entities, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/entities"),
        json={"entity_list": entities},
        cookies=cookies,
        timeout=9,
    )


def post_chunk(url, offset, limit, up_until_time=None, cookies=None):
    json = {"offset": offset, "limit": limit}
    if up_until_time is not None:
        json["up_until_time"] = format_datetime_request(up_until_time)
    return requests.post(
        urljoin(url, "cosmae/api/entities/chunk"),
        json=json,
        cookies=cookies,
        timeout=9,
    )


def get_search(url, search_term, up_until_time=None, cookies=None):
    url += f"/cosmae/api/entities/search?term={search_term}"
    if up_until_time is not None:
        url += "&up_until_time=" + format_datetime_request(up_until_time).replace(
            "+", "%2b"
        )
    return requests.get(
        url,
        cookies=cookies,
        timeout=900,
    )


def put_justification(url, id_entity_persistent, text, cookies=None):
    return requests.put(
        urljoin(
            url,
            f"cosmae/api/entities/{id_entity_persistent}/justifications",
        ),
        json={"justification_txt": text},
        cookies=cookies,
        timeout=9,
    )


def get_justification(url, id_entity_persistent, up_until_time=None, cookies=None):
    url += f"/cosmae/api/entities/{id_entity_persistent}/justifications?"
    if up_until_time is not None:
        url += "up_until_time=" + format_datetime_request(up_until_time).replace(
            "+", "%2b"
        )

    return requests.get(
        url,
        cookies=cookies,
        timeout=9,
    )


def get_entity_details(url, id_entity_persistent, up_until_time=None, cookies=None):
    return get_entity_details_list(url, [id_entity_persistent], up_until_time, cookies)


def get_entity_details_list(
    url, id_entity_persistent_list, up_until_time=None, cookies=None
):

    payload = {"id_entity_persistent_list": id_entity_persistent_list}
    if up_until_time is not None:
        payload["up_until_time"] = format_datetime_request(up_until_time)
    return requests.post(
        url + "/cosmae/api/entities/details",
        cookies=cookies,
        json=payload,
        timeout=900,
    )


def get_entity_values(url, id_entity_persistent, up_until_time=None, cookies=None):
    url += "/cosmae/api/entities/values?id_persistent=" + id_entity_persistent
    if up_until_time is not None:
        url += "&up_until_time=" + format_datetime_request(up_until_time).replace(
            "+", "%2b"
        )
    return requests.get(
        url,
        cookies=cookies,
        timeout=900,
    )
