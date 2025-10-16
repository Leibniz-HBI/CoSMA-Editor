# pylint: disable=invalid-name,missing-module-docstring
from datetime import datetime, timezone

import tests.user.common as cu

name_column_test = "name column test"
name_column_test_user = "name column test_user"
name_column_test1 = "name column test1"
name_column_parent_test = "column_def_parent_test"
name_column_parent_test_changed = "column_def_parent_test_changed"
name_column_child_0 = "test column child 0"
name_column_child_0_changed = "test column child 0 changed"
name_column_child_1 = "test column child 1"
name_column_curated_test = "name curated column test"
name_column_disabled_test = "name column def disabled test"
time_edit_test = datetime(2022, 12, 20, tzinfo=timezone.utc)
time_edit_test1 = datetime(2022, 12, 21, tzinfo=timezone.utc)
time_edit_curated_test = datetime(2022, 12, 22, tzinfo=timezone.utc)
id_column_persistent_test = "b17463e5-8f95-4b12-bc31-b469030f813a"
id_column_parent_persistent_test = "5a682460-9a91-414e-8c87-b5e1cb00dd97"
id_column_persistent_test_user = "e37a05ca-d5f1-4bff-ba6f-d2f3a1f45e76"
id_column_persistent_test_user1 = "52d5de0a-2fdb-457f-80d0-6e10131ad1b9"
id_column_persistent_child_0 = "f2a2e623-404d-494c-9f6d-3436f5d0ad48"
id_column_persistent_child_1 = "e0a3ec8d-3365-4979-8e51-6fcc3e445afd"
id_column_persistent_child_parent = "2eea6ebb-b83b-404e-ad9a-80f6b014a488"
id_column_persistent_child_parent_child = "49e45ba7-36cf-4725-a297-f315ee3d1b49"
id_column_curated_test = "2ec43995-338b-4f4b-b1cc-4bfc71466fc5"
id_column_disabled_test = "6698156c-a425-40d1-b792-014d81ca216f"
id_merge_request = "8561750e-856f-44ad-a660-137caf9487a7"
time_created_merge_request = datetime(2021, 3, 9, tzinfo=timezone.utc)
id_contribution = "9e022465-600e-4870-8224-e647ae550575"
id_ownership_request_test = "1a3e5449-bd68-4d47-a8b8-b53135bb91ad"
id_ownership_request_curated_test = "52f6cb25-dd1d-41d9-b1d2-bb4c34c734bf"

column_parent_rsp = {
    "id_persistent": id_column_parent_persistent_test,
    "name": name_column_parent_test,
    "name_path": [name_column_parent_test],
    "id_parent_persistent": None,
    "type": "INNER",
    "owner": {
        "username": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "CONTRIBUTOR",
    },
    "curated": False,
    "description": None,
    "disabled": False,
    "hidden": False,
}
column_child_0_rsp = {
    "id_persistent": id_column_persistent_child_0,
    "name": name_column_child_0,
    "name_path": [name_column_child_0],
    "id_parent_persistent": id_column_parent_persistent_test,
    "type": "FLOAT",
    "owner": {
        "username": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "CONTRIBUTOR",
    },
    "curated": False,
    "description": None,
    "disabled": False,
    "hidden": False,
}
column_child_1_rsp = {
    "id_persistent": id_column_persistent_child_1,
    "name": name_column_child_1,
    "name_path": [name_column_child_1],
    "id_parent_persistent": id_column_parent_persistent_test,
    "type": "FLOAT",
    "owner": {
        "username": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "CONTRIBUTOR",
    },
    "curated": False,
    "description": None,
    "disabled": False,
    "hidden": False,
}
column_child_1_hidden_rsp = {
    "id_persistent": id_column_persistent_child_1,
    "name": name_column_child_1,
    "name_path": [name_column_child_1],
    "id_parent_persistent": id_column_parent_persistent_test,
    "type": "FLOAT",
    "owner": {
        "username": cu.test_username,
        "id_persistent": cu.test_uuid,
        "permission_group": "CONTRIBUTOR",
    },
    "curated": False,
    "description": None,
    "disabled": False,
    "hidden": True,
}
column_curated_rsp = {
    "id_persistent": id_column_curated_test,
    "name": name_column_curated_test,
    "name_path": [name_column_curated_test],
    "id_parent_persistent": None,
    "type": "BOOL",
    "owner": None,
    "curated": True,
    "description": None,
    "disabled": False,
    "hidden": False,
}
