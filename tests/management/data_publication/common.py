# pylint: disable=invalid-name
"Common variables used in data publication tests."

from datetime import datetime, timezone

created_name = "Test Publication"
created_start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
created_end_date = datetime(2024, 12, 31, tzinfo=timezone.utc)
created_id_persistent = "123e4567-e89b-12d3-a456-426614174000"

working_name = "Working Publication"
working_start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
working_end_date = datetime(2025, 12, 31, tzinfo=timezone.utc)
working_id_persistent = "738bfb58-871b-4c35-a676-7ee1aa4c7603"

display_txt_name = "Display Text Publication"
display_txt_start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
display_txt_end_date = datetime(2025, 12, 31, tzinfo=timezone.utc)
display_txt_id_persistent = "89b059f6-9f43-43d2-82ad-6a68bd757260"
