"Helper functions for tests."

from datetime import datetime


def format_datetime_response(dt: datetime):
    "Helper function for formatting dates like django+ninja"
    date_string = dt.strftime("%Y-%m-%dT%H:%M:%S%z")
    if date_string[-5:] == "+0000":
        date_string = date_string[:-5] + "Z"
    return date_string


def format_datetime_request(dt: datetime):
    "Helper function for formatting dates like django+ninja"
    date_string = dt.strftime("%Y-%m-%dT%H:%M:%S.000%z")
    if date_string[-5:] == "+0000":
        date_string = date_string[:-5] + "Z"
    return date_string


def parse_datetime_cookie(date_str):
    "parse cookie date"
    return datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %Z")


def version_sort_key(dictionary):
    "Sort key for sorting dicts according to entry with key 'version'"
    return dictionary["version"]


def id_persistent_sort_key(dictionary):
    "Sort key for id persistent."
    return dictionary["id_persistent"]


def sort_versioned(lst):
    "Sort a list of dictionaries according to their entries with key 'version'"
    return sorted(lst, key=version_sort_key)


def assert_versioned(
    actual, expected, path=None, version_key="version", list_sort_key=None
):
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
                assert_versioned(
                    actual[key],
                    expected[key],
                    path + [key],
                    version_key,
                    list_sort_key,
                )
    elif isinstance(actual, list):
        assert isinstance(expected, list)
        assert len(actual) == len(expected)

        if list_sort_key is None or isinstance(expected, str):
            actual_sorted = actual
            expected_sorted = expected
        else:
            actual_sorted = sorted(actual, key=list_sort_key)
            expected_sorted = sorted(expected, key=list_sort_key)
        for idx, tpl in enumerate(zip(actual_sorted, expected_sorted)):
            actual_element, expected_element = tpl
            assert_versioned(
                actual_element,
                expected_element,
                path + [idx],
                version_key,
                list_sort_key,
            )
    else:
        try:
            assert actual == expected
        except AssertionError:
            raise AssertionError(path)  # pylint: disable=raise-missing-from
