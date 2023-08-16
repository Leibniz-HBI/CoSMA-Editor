"Helper functions for tests."


def format_datetime(datetime):
    "Helper function for formatting dates like django+ninja"
    return datetime.isoformat() + "Z"


def assert_versioned(actual, expected):
    """Helper function for checking nested dictionaries with version information.
    The actual value of the version is ignored, as it may change depending on test order."""
    if isinstance(actual, dict):
        assert isinstance(expected, dict)
        if len(actual) == len(expected) + 1:
            assert "version" in actual
            assert "version" not in expected
        else:
            assert len(actual) == len(expected)
        for key in actual:
            if key != "version":
                assert_versioned(actual[key], expected[key])
    elif isinstance(actual, list):
        assert isinstance(expected, list)
        assert len(actual) == len(expected)
        for actual_element, expected_element in zip(actual, expected):
            assert_versioned(actual_element, expected_element)
    else:
        assert actual == expected
