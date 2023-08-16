# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from datetime import datetime, timezone

test_username = "test-user"
test_password = "test1234"
test_email = "user@test.org"
test_names_personal = "test name personal"
test_uuid = "6af69cf4-7227-4bb4-af4a-b8e020731b86"

test_username1 = "test-user1"
test_password1 = "test5678"
test_email1 = "user1@test.org"
test_names_personal1 = "test other name"
test_uuid1 = "2e858c5e-60cf-4ce5-946f-6b4559a21211"

test_login_api = {"name": test_username, "password": test_password}


name_tag_def = "tag def user test"
name_tag_def1 = "tag def user test1"
name_tag_def2 = "tag def user test2"
name_tag_def3 = "tag def user test3"
id_tag_def_persistent = "798157ef-0220-406a-a94d-f2bac7406eb7"
id_tag_def_persistent1 = "18a68838-6f9b-4e82-a223-3cca31fdc96a"
id_tag_def_persistent2 = "9a90a726-78b1-4663-9ec1-3f72fca2c229"
id_tag_def_persistent3 = "33e9f23f-83dc-453e-bf73-e038daa32952"
time_edit_tag_def = datetime(1742, 3, 2, tzinfo=timezone.utc)
time_edit_tag_def1 = datetime(1742, 3, 3, tzinfo=timezone.utc)
time_edit_tag_def2 = datetime(1742, 3, 4, tzinfo=timezone.utc)
time_edit_tag_def3 = datetime(1742, 3, 5, tzinfo=timezone.utc)
