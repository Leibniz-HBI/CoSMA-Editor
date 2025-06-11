# pylint: disable=unused-argument
"Tests for deleting ssh_keys"

import tests.user.ssh.api.integration.requests as req
import tests.user.ssh.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.user.ssh.models_django import SshKey


def test_no_cookies(live_server):
    "Test response for missing cookies"
    rsp = req.delete_key(live_server.url, c.id_ssh_key)
    assert rsp.status_code == 401


def test_unauthenticated(auth_server, mocker):
    "Test unauthenticated response."
    server, cookies = auth_server
    mock = mocker.MagicMock(side_effect=NotAuthenticatedException)
    with mocker.patch("cosmae.user.ssh.api.check_user", mock):
        rsp = req.delete_key(server.url, c.id_ssh_key, cookies=cookies)
    assert rsp.status_code == 401


def test_delete_key(auth_server, ssh_key, ssh_key1):
    "Make sure deletion is possible"
    server, cookies = auth_server
    rsp = req.delete_key(server.url, ssh_key.id_persistent, cookies=cookies)
    assert rsp.status_code == 200
    key = SshKey.objects.all().get()
    assert key.id_persistent == ssh_key1.id_persistent


def test_can_not_delete_last_key(auth_server, ssh_key, ssh_key_user1):
    "Make sure last key can not be deleted"
    server, cookies = auth_server
    rsp = req.delete_key(server.url, ssh_key.id_persistent, cookies=cookies)
    assert rsp.status_code == 400
    key = SshKey.objects.filter(user=ssh_key.user).get()
    assert key.id_persistent == ssh_key.id_persistent
