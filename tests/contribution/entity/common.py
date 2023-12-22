# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from datetime import datetime, timezone

id_persistent_entity_duplicate_test = "f43e8697-713c-40cc-ac3e-d8f63fd87c08"
display_txt_test_entity_duplicate = "test entity d"  # similar to test entity [0,1]
time_edit_test_duplicate = datetime(2022, 4, 23, tzinfo=timezone.utc)
id_tag_def_test = "id-tag-def-test"
name_tag_def_test = "tag def for entity-replace test"
time_edit_tag_def_test = datetime(2020, 7, 3, tzinfo=timezone.utc)
id_tag_def_test1 = "id-tag-def-test1"
name_tag_def_test1 = "tag def for entity-replace test1"
time_edit_tag_def_test1 = datetime(2020, 7, 4, tzinfo=timezone.utc)
id_instance_replace_test = "tag-instance-test"
id_instance_replace_test1 = "tag-instance-test1"
id_instance_existing_test = "tag-existing-test"
id_instance_existing_test1 = "tag-existing-test1"
time_edit_tag_instance_test = datetime(1990, 5, 7, tzinfo=timezone.utc)

time_edit_deduplication = datetime(2021, 1, 1, tzinfo=timezone.utc)

id_tag_instance_match_destination = "2ce8231e-5a58-4f43-8ef4-89efca0a6b97"
id_tag_instance_match_origin = "db0079c1-4cbf-43e8-ad19-e5dee0ae7405"
id_tag_merge_request_persistent = "af01c5cb-33b9-4b05-ade5-6d821a2d3075"
time_edit_tag_instance_match_origin = datetime(2022, 1, 1)
time_edit_tag_instance_match_destination = datetime(2021, 12, 3)
time_edit_tag_merge_request = datetime(2022, 1, 2)
