# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument

import tests.edit_session.common as cs
import tests.user.api.integration.requests as req
import tests.user.common as c


def test_unauthenticated(live_server):
    "Test response for missing authentication information"
    rsp = req.get_self(live_server.url)
    assert rsp.status_code == 401
    assert rsp.json() == {
        "status": 401,
        "data": {"flows": [{"id": "login"}, {"id": "signup"}]},
        "meta": {"is_authenticated": False},
    }


def test_success(auth_server):
    "Check successful response"
    live_server, cookies = auth_server
    rsp = req.get_self(live_server.url, cookies=cookies)
    json = rsp.json()
    edit_session_participant_api = {
        "type_participant": "INTERNAL",
        "id_participant": c.test_uuid,
        "name_participant": c.test_username,
    }
    assert json == {
        "status": 200,
        "meta": {"is_authenticated": True},
        "data": {
            "id_persistent": c.test_uuid,
            "username": c.test_username,
            "names_personal": c.test_names_personal,
            "names_family": "",
            "email": c.test_email,
            "permission_group": "CONTRIBUTOR",
            "column_list": [],
            "edit_session": {
                "owner": {
                    "id_participant": c.test_uuid,
                    "type_participant": "INTERNAL",
                },
                "id_persistent": cs.id_session_user,
                "name": cs.name_session_user,
                "participant_list": [edit_session_participant_api],
            },
        },
    }


def test_no_mfa(auth_server_no_mfa, user_email_verified):
    "Check response for missing mfa"
    live_server, cookies = auth_server_no_mfa
    rsp = req.get_self(live_server.url, cookies=cookies)
    json = rsp.json()
    assert json == {
        "status": 401,
        "data": {
            "flows": [{"id": "mfa_register", "is_pending": True}],
        },
        "meta": {"is_authenticated": False},
    }


def test_no_verified_email(auth_server_no_mfa, user_email_unverified):
    "Check response for missing mfa"
    live_server, cookies = auth_server_no_mfa
    rsp = req.get_self(live_server.url, cookies=cookies)
    json = rsp.json()
    assert json == {
        "status": 401,
        "data": {
            "flows": [{"id": "verify_email", "is_pending": True}],
        },
        "meta": {"is_authenticated": False},
    }
