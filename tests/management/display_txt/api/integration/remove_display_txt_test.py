# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument, duplicate-code
from unittest.mock import MagicMock, patch

import tests.management.display_txt.api.integration.requests as req
import tests.tag.common as ct
from cosmae.exception import NotAuthenticatedException
from cosmae.management.display_txt.util import DISPLAY_TXT_ORDER_CONFIG_KEY
from cosmae.management.models_django import ConfigValue


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.delete_column(server.url, "some-id")
    assert rsp.status_code == 401


def test_not_authenticated(auth_server):
    server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.management.display_txt.api.check_user", mock):
        rsp = req.delete_column(server.url, "some-id", cookies=cookies)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server):
    server, cookies = auth_server
    rsp = req.delete_column(server.url, "some-id", cookies=cookies)
    assert rsp.status_code == 403


def test_unknown_tag_def(auth_server_commissioner):
    server, cookies = auth_server_commissioner
    rsp = req.delete_column(server.url, "some-id", cookies=cookies)
    assert rsp.status_code == 200


def test_remove_only(auth_server_commissioner, display_txt_order_0):
    server, cookies = auth_server_commissioner
    rsp = req.delete_column(server.url, ct.id_column_persistent_test, cookies=cookies)
    assert rsp.status_code == 200
    default = "default for test"
    assert ConfigValue.get(DISPLAY_TXT_ORDER_CONFIG_KEY, default=default) == default


def test_remove_start(auth_server_commissioner, display_txt_order_0_1_curated):
    server, cookies = auth_server_commissioner
    rsp = req.delete_column(server.url, ct.id_column_persistent_test, cookies=cookies)
    assert rsp.status_code == 200
    assert ConfigValue.get(DISPLAY_TXT_ORDER_CONFIG_KEY) == [
        ct.id_column_persistent_test_user1,
        ct.id_column_curated_test,
    ]


def test_remove_middle(auth_server_commissioner, display_txt_order_0_1_curated):
    server, cookies = auth_server_commissioner
    rsp = req.delete_column(
        server.url, ct.id_column_persistent_test_user1, cookies=cookies
    )
    assert rsp.status_code == 200
    assert ConfigValue.get(DISPLAY_TXT_ORDER_CONFIG_KEY) == [
        ct.id_column_persistent_test,
        ct.id_column_curated_test,
    ]


def test_remove_end(auth_server_commissioner, display_txt_order_0_1_curated):
    server, cookies = auth_server_commissioner
    rsp = req.delete_column(server.url, ct.id_column_curated_test, cookies=cookies)
    assert rsp.status_code == 200
    assert ConfigValue.get(DISPLAY_TXT_ORDER_CONFIG_KEY) == [
        ct.id_column_persistent_test,
        ct.id_column_persistent_test_user1,
    ]
