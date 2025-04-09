# pylint: disable=unused-argument
"Test for (re)setting passwords"

import tests.user.common as c
from tests.user.api.integration.requests import post_password


def test_no_cookies(live_server):
    "Make sure cookies are needed"
    rsp = post_password(live_server.url, c.test_password_new, c.test_password)
    assert rsp.status_code == 401


def test_set_for_other_as_non_commissioner(auth_server, user1):
    "Make sure that normal users can't set password for others."
    server, cookies = auth_server
    rsp = post_password(
        server.url,
        c.test_password_new,
        id_user_persistent=c.test_uuid1,
        cookies=cookies,
    )
    assert rsp.status_code == 403


def test_wrong_password(auth_server_applicant):
    "Check error password for incorrect old password"
    server, cookies = auth_server_applicant
    rsp = post_password(
        server.url, c.test_password_new, "wrong_password", cookies=cookies
    )
    assert rsp.status_code == 400


def test_for_self(auth_server_applicant):
    "Make sure a user can set its own password"
    server, cookies = auth_server_applicant
    rsp = post_password(
        server.url, c.test_password_new, c.test_password_applicant, cookies=cookies
    )
    assert rsp.status_code == 200


def test_set_for_other(auth_server_commissioner, user):
    "Make sure a commissioner can set others passwords."
    server, cookies = auth_server_commissioner
    rsp = post_password(
        server.url, c.test_password_new, id_user_persistent=c.test_uuid, cookies=cookies
    )
    assert rsp.status_code == 200
