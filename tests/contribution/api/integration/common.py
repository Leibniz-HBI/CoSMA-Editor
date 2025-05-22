# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
from datetime import datetime, timezone

import tests.contribution.common as c
import tests.edit_session.common as cs
import tests.user.common as cu

contribution_post0 = {
    "name": c.name_test0,
    "description": c.description_test0,
    "has_header": False,
    "id_edit_session_persistent": cs.id_session_user,
}

contribution_post1 = {
    "name": c.name_test1,
    "description": c.description_test1,
    "has_header": True,
    "id_edit_session_persistent": cs.id_session_user,
}

contribution_test_upload0 = {
    "name": c.name_test0,
    "description": c.description_test0,
    "has_header": False,
    "author": cu.test_username,
    "state": "UPLOADED",
    "error_msg": None,
    "error_details": None,
    "empty_values": "null,nan,na",
    "justification_txt": None,
    "id_edit_session_persistent": cs.id_session_user,
}

contribution_test_upload1 = {
    "name": c.name_test1,
    "description": c.description_test1,
    "has_header": True,
    "author": cu.test_username,
    "state": "UPLOADED",
    "error_msg": None,
    "error_details": None,
    "empty_values": "null,nan,na",
    "justification_txt": None,
    "id_edit_session_persistent": cs.id_session_user,
}

column_test0 = {
    "name": c.name_definition_test0,
    "id_persistent": c.id_persistent_column_test0,
    "id_existing_persistent": None,
    "index_in_file": 9000,
    "discard": True,
}

column_test1 = {
    "name": c.name_definition_test1,
    "id_persistent": c.id_persistent_column_test1,
    "id_existing_persistent": None,
    "index_in_file": 900,
    "discard": False,
}

id_column_merge_request_persistent = "ab6a456e-4560-458b-9f8d-864bdcccc904"
time_edit_column_merge_request = datetime(2020, 2, 3, tzinfo=timezone.utc)
