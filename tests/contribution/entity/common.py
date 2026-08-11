# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from datetime import datetime, timezone

id_persistent_entity_duplicate_test = "f43e8697-713c-40cc-ac3e-d8f63fd87c08"
display_txt_test_entity_duplicate = "test entity d"  # similar to test entity [0,1]
time_edit_test_duplicate = datetime(2022, 4, 23, tzinfo=timezone.utc)
id_persistent_entity_duplicate_test1 = "a97f88bb-c38c-4e55-a441-fee05fd301b9"
display_txt_test_entity_duplicate1 = (
    "another contribution entity"  # similar to test entity [0,1]
)
time_edit_test_duplicate1 = datetime(2022, 4, 24, tzinfo=timezone.utc)
id_persistent_entity_duplicate_no_match_test = "136810a9-ccc5-4f7d-87e7-e7d44bdd9cf8"
display_txt_test_entity_duplicate_no_match = (
    "something completely different"  # different from entity [0,1] on purpose
)
time_edit_test_duplicate_no_match = datetime(2022, 4, 23, tzinfo=timezone.utc)
id_column_test = "a33991a8-4581-46d2-b9bd-ef6d1d71cc87"
id_column_test = "a33991a8-4581-46d2-b9bd-ef6d1d71cc87"
name_column_test = "column for entity-replace test"
time_edit_column_test = datetime(2020, 7, 3, tzinfo=timezone.utc)
id_column_test1 = "2117de68-e451-4a5b-935f-37fcf626bfff"
name_column_test1 = "column for entity-replace test1"
time_edit_column_test1 = datetime(2020, 7, 4, tzinfo=timezone.utc)
id_value_replace_test = "09b39d13-eae5-4bd8-ba82-7951aa0dda6e"
id_value_replace_test1 = "d1868cef-5cb3-45d8-b9b8-3181f881a6a7"
id_value_existing_test = "7dc10eb3-d916-43c5-a58d-c3cd83407d61"
id_value_existing_test1 = "c183948f-2f9b-4005-9855-dee2ad7b1562"
time_edit_value_test = datetime(1990, 5, 7, tzinfo=timezone.utc)

time_edit_deduplication = datetime(2021, 1, 1, tzinfo=timezone.utc)

id_value_match_destination = "2ce8231e-5a58-4f43-8ef4-89efca0a6b97"
id_value_match_origin = "db0079c1-4cbf-43e8-ad19-e5dee0ae7405"
id_column_merge_request_persistent = "af01c5cb-33b9-4b05-ade5-6d821a2d3075"
time_edit_value_match_origin = datetime(2022, 1, 1, tzinfo=timezone.utc)
time_edit_value_match_destination = datetime(2021, 12, 3, tzinfo=timezone.utc)
time_edit_column_merge_request = datetime(2022, 1, 2, tzinfo=timezone.utc)

justification_id_persistent = "26fed0c2-6ba5-4616-ad7e-1a707733ab3e"
justification_text = "This is a test justification for the entity duplicate."
justification_timestamp = datetime(2022, 1, 3, tzinfo=timezone.utc)
