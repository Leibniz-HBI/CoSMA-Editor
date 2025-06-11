# pylint: disable=unused-argument
"Tests for getting ssh_keys"

import tests.user.ssh.api.integration.requests as req
import tests.user.ssh.common as c
from cosmae.exception import NotAuthenticatedException


def test_no_cookies(live_server):
    "Test response for missing cookies"
    rsp = req.get_key_list(live_server.url)
    assert rsp.status_code == 401


def test_unauthenticated(auth_server, mocker):
    "Test unauthenticated response."
    server, cookies = auth_server
    mock = mocker.MagicMock(side_effect=NotAuthenticatedException)
    with mocker.patch("cosmae.user.ssh.api.check_user", mock):
        rsp = req.get_key_list(server.url, cookies=cookies)
    assert rsp.status_code == 401


def test_get_list(auth_server, ssh_key, ssh_key1, ssh_key_user1):
    "Make sure correct keys are retrieved."
    server, cookies = auth_server
    rsp = req.get_key_list(server.url, cookies=cookies)
    assert rsp.status_code == 200
    key_list = rsp.json()["key_list"]
    assert len(key_list) == 2
    assert {key["id_persistent"] for key in key_list} == {c.id_ssh_key, c.id_ssh_key1}
