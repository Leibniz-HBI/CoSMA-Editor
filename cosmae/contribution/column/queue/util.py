"Utils for contribution candidate queue methods."

from collections import defaultdict

from django.conf import settings
from pandas import read_csv


class DelimiterNotFoundException(Exception):
    "Exception when not finding a delimiter"

    def __init__(self) -> None:
        super("Could not detect delimiter")


def find_delimiter(csv_pth, encoding, has_header):
    "Try to find the delimiter of a csv file."
    counts = defaultdict(int)
    with open(csv_pth, "r", encoding=encoding) as csv_file:
        for _ in range(10):
            buffer = csv_file.read(1024)
            for char in buffer:
                if has_header and char == "\n":
                    break
                if not char.isalpha():
                    counts[char] += 1
    tab_count = counts["\t"]
    comma_count = counts[","]
    semicolon_count = counts[";"]
    if comma_count > semicolon_count:
        if comma_count > tab_count:
            return ","
        return "\t"
    if semicolon_count > tab_count:
        return ";"
    if tab_count > 0:
        return "\t"
    raise DelimiterNotFoundException()


def read_csv_of_candidate(contribution, nrows=None):
    "Read the csv file belonging to a contribution candidate"
    pth = settings.CONTRIBUTION_DIRECTORY / contribution.file_name
    if contribution.has_header:
        header_param = 0
    else:
        header_param = None
    for encoding in ["utf-8", "iso-8859-1"]:
        try:
            delimiter = find_delimiter(pth, encoding, contribution.has_header)
            data_frame = read_csv(
                pth,
                header=header_param,
                nrows=nrows,
                dtype=str,
                encoding=encoding,
                delimiter=delimiter,
                escapechar="\\",
            )
            return data_frame
        except ValueError:
            pass
    raise Exception(  # pylint: disable=broad-exception-raised
        "Could not decode the csv."
    )
