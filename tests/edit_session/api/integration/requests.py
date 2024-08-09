# pylint: disable=missing-module-docstring,missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements

import requests


def put_edit_session(url, name=None, cookies=None):
    body = {}
    if name is not None:
        body["name"] = name
    return requests.put(
        url + "/cosmae/api/edit_sessions", cookies=cookies, timeout=900, json=body
    )


def put_participant(
    url,
    id_edit_session_persistent,
    type_participant,
    id_participant,
    name_participant,
    cookies=None,
):
    return requests.put(
        url + f"/cosmae/api/edit_sessions/{id_edit_session_persistent}/participants",
        json={
            "type_participant": type_participant,
            "id_participant": id_participant,
            "name_participant": name_participant,
        },
        cookies=cookies,
        timeout=900,
    )


def post_search_participant(url, search_term, cookies=None):
    return requests.post(
        url + "/cosmae/api/edit_sessions/search",
        json={"search_term": search_term},
        cookies=cookies,
        timeout=900,
    )


def get_sessions_owner(url, cookies=None):
    return requests.get(
        url + "/cosmae/api/edit_sessions/owner", cookies=cookies, timeout=900
    )


def get_sessions_participant(url, cookies=None):
    return requests.get(
        url + "/cosmae/api/edit_sessions/participant", cookies=cookies, timeout=900
    )


def patch_edit_session(url, id_edit_session_persistent, name, cookies=None):
    return requests.patch(
        url + f"/cosmae/api/edit_sessions/{id_edit_session_persistent}",
        json={"name": name},
        cookies=cookies,
        timeout=900,
    )


def delete_participant(url, id_edit_session, id_participant, cookies=None):
    return requests.delete(
        url + f"/cosmae/api/edit_sessions/{id_edit_session}/participants",
        json={"id_participant": id_participant, "type_participant": "INTERNAL"},
        cookies=cookies,
        timeout=900,
    )
