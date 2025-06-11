"Requests for testing ssh key API."

import requests as req


def put_key(url, key_text: str, id_user_persistent: str | None = None, cookies=None):
    "Test method for adding a SSH key"
    data = {"key": key_text}
    if id_user_persistent is not None:
        data["id_user_persistent"] = id_user_persistent
    return req.put(url + "/cosmae/api/user/ssh", json=data, cookies=cookies, timeout=300)


def get_key_list(url, cookies=None):
    "Test method for getting SSH keys"
    return req.get(url + "/cosmae/api/user/ssh", cookies=cookies, timeout=300)


def delete_key(url, id_key_persistent, cookies=None):
    "Test method for deleting a SSH key"
    return req.delete(
        url + f"/cosmae/api/user/ssh/key/{id_key_persistent}",
        cookies=cookies,
        timeout=300,
    )
