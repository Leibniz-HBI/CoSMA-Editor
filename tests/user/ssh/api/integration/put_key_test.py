# pylint: disable=unused-argument
"Tests for adding a new ssh key"
import tests.user.common as cu
import tests.user.ssh.api.integration.requests as req
import tests.user.ssh.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.user.ssh.models_django import SshKey


def test_no_cookies(live_server):
    "Test response for missing cookies"
    rsp = req.put_key(live_server.url, "")
    assert rsp.status_code == 401


def test_unauthenticated(auth_server, mocker):
    "Test unauthenticated response."
    server, cookies = auth_server
    mock = mocker.MagicMock(side_effect=NotAuthenticatedException)
    with mocker.patch("cosmae.user.ssh.api.check_user", mock):
        rsp = req.put_key(server.url, "", cu.test_uuid1, cookies=cookies)
    assert rsp.status_code == 401


def test_different_user_non_commissioner(auth_server, user1):
    "Make sure a non commissioner can not set ssh key for a different user."
    server, cookies = auth_server
    rsp = req.put_key(server.url, "", cu.test_uuid1, cookies=cookies)
    assert rsp.status_code == 403


def test_put_user_invalid_key(auth_server, ssh_api_uuid_mock):
    "Make sure users can add keys for themselves"
    server, cookies = auth_server
    rsp = req.put_key(server.url, "invalid_key", cookies=cookies)
    assert rsp.status_code == 400


def test_put_user(auth_server, ssh_api_uuid_mock):
    "Make sure users can add keys for themselves"
    server, cookies = auth_server
    rsp = req.put_key(server.url, c.ssh_key, cookies=cookies)
    assert rsp.status_code == 200
    type_key, key, name = c.ssh_key.split(" ")
    assert rsp.json() == {
        "id_persistent": c.id_ssh_key,
        "type": type_key,
        "name": name,
    }
    key_db = SshKey.objects.filter(id_persistent=c.id_ssh_key).get()
    assert key_db.type == type_key
    assert key_db.key == key
    assert key_db.name == name


def test_put_commissioner(auth_server_commissioner, user, ssh_api_uuid_mock):
    "Make sure commissioner can add key for other user."
    server, cookies = auth_server_commissioner
    rsp = req.put_key(server.url, c.ssh_key, cu.test_uuid, cookies=cookies)
    assert rsp.status_code == 200
    type_key, key, name = c.ssh_key.split(" ")
    assert rsp.json() == {
        "id_persistent": c.id_ssh_key,
        "type": type_key,
        "name": name,
    }
    key_db = SshKey.objects.filter(id_persistent=c.id_ssh_key).get()
    assert key_db.type == type_key
    assert key_db.key == key
    assert key_db.name == name
    assert key_db.user_id == user.id


def test_put_commissioner_missing_user(auth_server_commissioner, ssh_api_uuid_mock):
    "Make sure commissioner can not add key for missing user."
    server, cookies = auth_server_commissioner
    rsp = req.put_key(server.url, c.ssh_key, cu.test_uuid, cookies=cookies)
    assert rsp.status_code == 404
