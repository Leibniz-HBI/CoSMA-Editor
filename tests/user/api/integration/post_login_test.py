# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,duplicate-code
import tests.edit_session.common as cs
import tests.user.common as c
from tests.user.api.integration.requests import post_login


def test_invalid_credentials(auth_server):
    live_server, _ = auth_server
    rsp = post_login(
        live_server.url, {"name": c.test_username, "password": "incorrect"}
    )
    assert rsp.status_code == 200
    assert rsp.json() == {"msg": "Invalid credentials."}


def test_valid_credentials(auth_server):
    live_server, _ = auth_server
    rsp = post_login(
        live_server.url, {"name": c.test_username, "password": c.test_password}
    )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "username": c.test_username,
        "names_personal": c.test_names_personal,
        "email": c.test_email,
        "names_family": "",
        "tag_definition_list": [],
        "id_persistent": c.test_uuid,
        "permission_group": "CONTRIBUTOR",
        "edit_session": {
            "id_persistent": cs.id_session_user,
            "name": cs.name_session_user,
            "owner": {"type_participant": "INTERNAL", "id_participant": c.test_uuid},
            "participant_list": [
                {
                    "id_participant": c.test_uuid,
                    "type_participant": "INTERNAL",
                    "name_participant": c.test_username,
                }
            ],
        },
    }
