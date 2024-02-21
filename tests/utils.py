"Helper functions for tests."


def format_datetime(datetime):
    "Helper function for formatting dates like django+ninja"
    return datetime.isoformat() + "Z"


def version_sort_key(dictionary):
    "Sort key for sorting dicts according to entry with key 'version'"
    return dictionary["version"]


def sort_versioned(lst):
    "Sort a list of dictionaries according to their entries with key 'version'"
    return sorted(lst, key=version_sort_key)


def assert_versioned(actual, expected, path=None, version_key="version"):
    """Helper function for checking nested dictionaries with version information.
    The actual value of the version is ignored, as it may change depending on test order.
    """
    if path is None:
        path = []
    if isinstance(actual, dict):
        assert isinstance(expected, dict)
        if len(actual) == len(expected) + 1:
            assert version_key in actual
            assert version_key not in expected
        else:
            assert len(actual) == len(expected)
        for key in actual:
            if key != version_key:
                assert_versioned(actual[key], expected[key], path + [key])
    elif isinstance(actual, list):
        assert isinstance(expected, list)
        assert len(actual) == len(expected)
        for idx, tpl in enumerate(zip(actual, expected)):
            actual_element, expected_element = tpl
            assert_versioned(actual_element, expected_element, path + [idx])
    else:
        try:
            assert actual == expected
        except AssertionError:
            raise AssertionError(path)  # pylint: disable=raise-missing-from
