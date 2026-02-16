# pylint: disable=invalid-name
"Common variables used in data publication tests."

from datetime import datetime, timezone

import tests.edit_session.common as cs
import tests.user.common as cu

created_name = "Test Publication"
created_start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
created_end_date = datetime(2024, 12, 31, tzinfo=timezone.utc)
created_id_persistent = "123e4567-e89b-12d3-a456-426614174000"

working_name = "Working Publication"
working_start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
working_end_date = datetime(2025, 12, 31, tzinfo=timezone.utc)
working_id_persistent = "738bfb58-871b-4c35-a676-7ee1aa4c7603"

display_txt_name = "Display Text Publication"
display_txt_start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
display_txt_end_date = datetime(2022, 12, 31, tzinfo=timezone.utc)
display_txt_id_persistent = "89b059f6-9f43-43d2-82ad-6a68bd757260"

justification_name = "Justification Publication"
justification_start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
justification_end_date = datetime(2022, 12, 31, tzinfo=timezone.utc)
justification_id_persistent = "d1c798d9-db6c-4710-abe8-5bd7ff93833b"

curated_name = "Curated Publication"
curated_start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
curated_end_date = datetime(2022, 12, 31, tzinfo=timezone.utc)
curated_id_persistent = "dd98bb3f-01b5-44e2-b0de-c8324005003c"

user_name = "User Publication"
user_start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
user_end_date = datetime(2022, 12, 31, tzinfo=timezone.utc)
user_id_persistent = "4a24eb25-b08e-46da-8013-375e40f8a06e"

authors_name = "Authors Publication"
authors_start_date = datetime(2021, 1, 1, tzinfo=timezone.utc)
authors_end_date = datetime(2021, 12, 31, tzinfo=timezone.utc)
authors_id_persistent = "2aa83fdb-e04c-4b28-8312-6f7a304cfc3f"

metadata_test = {
    "column_curated": {cu.test_uuid1: 2, cs.id_session_user: 2},
    "justification": {cu.test_uuid: 2, cs.id_session_user: 2},
    "display_txt": {cu.test_uuid1: 3},
}
