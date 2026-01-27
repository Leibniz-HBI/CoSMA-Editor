"Tests for reading csv files."

from pathlib import Path

from cosmae.contribution.column.queue.util import find_delimiter

_CSV_DIR_PTH = (
    Path(__file__).resolve().parent.parent.parent.parent / "_test_data/csv_input"
)


def test_comma_confusion():
    "Make sure correct delimiter is found when commas are in values."
    pth = _CSV_DIR_PTH / "comma.csv"
    delimiter = find_delimiter(pth, "utf-8", has_header=True)
    assert delimiter == ";"
