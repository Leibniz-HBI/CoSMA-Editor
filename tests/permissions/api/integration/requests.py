# pylint: disable=missing-module-docstring.missing-function-docstring,too-many-positional-arguments,too-many-arguments
import requests


def put_permission(
    base_url,
    id_resource_persistent,
    id_user_persistent,
    read=None,
    write=None,
    cookies=None,
):
    url = (
        f"{base_url}/cosmae/api/permissions/{id_resource_persistent}/{id_user_persistent}"
    )
    return requests.put(
        url,
        json={"read": read, "write": write},
        cookies=cookies,
        timeout=900,
    )


def get_permissions_for_resource(base_url, id_resource_persistent, cookies=None):
    url = f"{base_url}/cosmae/api/permissions/resource/{id_resource_persistent}"
    return requests.get(url, cookies=cookies, timeout=900)
