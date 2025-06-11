"Test SSH key check"

import tests.user.ssh.common as c
from cosmae.user.ssh.models_django import check_key


def test_single_part():
    "Make sure single part key is not accepted"
    res = check_key("bla")
    assert res == [
        "Could not parse key. It must consist of three parts, separated by spaces."
    ]


def test_two_parts():
    "Make sure two part key is not accepted"
    res = check_key("bla bla")
    assert res == [
        "Could not parse key. It must consist of three parts, separated by spaces."
    ]


def test_invalid_char_in_type():
    "Make sure unwanted char in type is detected"
    parts = c.ssh_key.split(" ")
    res = check_key(" ".join(["a#b", parts[1], parts[2]]))
    assert res == ["Key type can only contain lower case, numbers or dashes."]


def test_invalid_char_in_key():
    "Make sure unwanted char in type is detected"
    parts = c.ssh_key.split(" ")
    res = check_key(" ".join([parts[0], "a#b", parts[2]]))
    assert res == ["The key has to be base64 encoded"]


def test_invalid_char_in_name():
    "Make sure unwanted char in type is detected"
    parts = c.ssh_key.split(" ")
    res = check_key(" ".join([parts[0], parts[1], "a#b"]))
    assert res == ['The character "#" is not allowed in key names.']
