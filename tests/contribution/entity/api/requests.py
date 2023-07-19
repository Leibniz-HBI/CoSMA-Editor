# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_entities(
    url, id_contribution_candidate_persistent, start, offset, cookies=None
):
    return requests.get(
        url
        + (
            f"/cosmae/api/contributions/{id_contribution_candidate_persistent}"
            f"/entities/chunk/{start}/{offset}"
        ),
        cookies=cookies,
        timeout=9,
    )


def post_similar(
    url, id_contribution_candidate_persistent, id_entity_persistent_list, cookies=None
):
    return requests.post(
        url
        + (
            f"/cosmae/api/contributions/{id_contribution_candidate_persistent}"
            "/entities/similar"
        ),
        json={"id_entity_persistent_list": id_entity_persistent_list},
        cookies=cookies,
        timeout=9,
    )


def put_duplicate(
    url,
    id_contribution_candidate_persistent,
    id_entity_origin_persistent,
    id_entity_destination_persistent,
    cookies=None,
):
    return requests.put(
        url
        + (
            f"/cosmae/api/contributions/{id_contribution_candidate_persistent}"
            f"/entities/{id_entity_origin_persistent}/duplicate"
        ),
        json={"id_entity_destination_persistent": id_entity_destination_persistent},
        cookies=cookies,
        timeout=9,
    )
