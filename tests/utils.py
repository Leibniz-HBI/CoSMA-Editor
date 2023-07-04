"Helper functions for tests."


def format_datetime(datetime):
    "Helper function for formatting dates like django+ninja"
    return datetime.isoformat() + "Z"
