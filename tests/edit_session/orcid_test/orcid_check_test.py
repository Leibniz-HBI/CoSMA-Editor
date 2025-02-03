# pylint: disable=missing-module-docstring
import tests.edit_session.common as c
from cosmae.edit_session.orcid import validate_orcid


def test_orcid():
    "Check whether a correct orcid is accepted"
    assert validate_orcid(c.orcid_0) == c.orcid_no_uri


def test_orcid_no_uri():
    "Check whether a correct orcid without uri is accepted"
    assert validate_orcid(c.orcid_no_uri) == c.orcid_no_uri


def test_orcid_no_dashed():
    "Check whether a correct orcid withour dashes is accepted"
    assert validate_orcid(c.orcid_no_dashes) == c.orcid_no_uri


def test_orcid_x_checksum():
    "Test whether an orcid with an X checksum is accepted."
    assert validate_orcid(c.orcid_x) == c.orcid_x_no_uri


def test_incorrect_checksum():
    "Test whether an orcid with incorrect checksum is rejected."
    orcid_invalid_checksum = "https://orcid.org/0000-0002-1825-0098"
    assert validate_orcid(orcid_invalid_checksum) is None


def test_too_short():
    "Test whether a too short orcid is rejected."
    orcid_invalid_length = "000000218250098"
    assert validate_orcid(orcid_invalid_length) is None


def test_too_long():
    "Test whether a too short orcid is rejected."
    orcid_invalid_length = "00000000218250098"
    assert validate_orcid(orcid_invalid_length) is None


def test_incorrect_dashes():
    "Test whether an orcid with incorrect dashes is rejected."
    orcid_invalid_checksum = "https://orcid.org/000-00002-1825-0098"
    assert validate_orcid(orcid_invalid_checksum) is None
