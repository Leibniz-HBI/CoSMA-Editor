# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

from urllib.parse import urljoin

import requests


def get_self(url, cookies=None):
    return requests.get(
        urljoin(url, "/cosmae/api/user/self"), cookies=cookies, timeout=900
    )


def post_append_id_column_persistent(url, id_column_persistent, cookies=None):
    return requests.post(
        url + f"/cosmae/api/user/columns/append/{id_column_persistent}",
        cookies=cookies,
        timeout=900,
    )


def delete_id_column_persistent(url, id_column_persistent, cookies=None):
    return requests.delete(
        url + f"/cosmae/api/user/columns/{id_column_persistent}",
        cookies=cookies,
        timeout=900,
    )


def post_change_columns(url, start_idx, end_idx, cookies=None):
    return requests.post(
        url + f"/cosmae/api/user/columns/change/{start_idx}/{end_idx}",
        cookies=cookies,
        timeout=900,
    )


def get_user_chunk(url, offset, limit, cookies=None):
    return requests.get(
        url + f"/cosmae/api/user/chunks/{offset}/{limit}",
        cookies=cookies,
        timeout=900,
    )


def put_permission_group(url, id_user_persistent, permission_group, cookies=None):
    return requests.put(
        url + f"/cosmae/api/user/id/{id_user_persistent}/permission_group",
        json={"permission_group": permission_group},
        cookies=cookies,
        timeout=900,
    )


def post_edit_session(url, id_edit_session_persistent, cookies=None):
    return requests.post(
        url + "/cosmae/api/user/edit_session",
        json={"id_edit_session_persistent": id_edit_session_persistent},
        cookies=cookies,
        timeout=900,
    )


def get_details(url, id_user_persistent, cookies=None):
    return requests.get(
        url + "/cosmae/api/user/id/" + id_user_persistent,
        cookies=cookies,
        timeout=900,
    )


def post_password(
    url, new_password, old_password=None, id_user_persistent=None, cookies=None
):
    return requests.post(
        url + "/cosmae/api/user/password",
        json={
            "new_password": new_password,
            "old_password": old_password,
            "id_user_persistent": id_user_persistent,
        },
        cookies=cookies,
        timeout=900,
    )
