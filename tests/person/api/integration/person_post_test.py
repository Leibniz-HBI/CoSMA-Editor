# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

import pytest
from django.db import IntegrityError

from tests.person.api.integration.requests import post_person, post_persons
from cosmae.person.models_django import Person

test_name_personal_0 = "test name personal 0"
test_name_family_0 = "test name family 0"
test_display_txt_0 = "test display text 0"
test_id_persistent_0 = "test_id_0"


@pytest.fixture
def names_only():
    return {
        "names_personal": test_name_personal_0,
        "names_family": test_name_family_0,
        "display_txt": test_display_txt_0,
    }


def test_id_no_version(auth_server, names_only):
    live_server, cookies = auth_server
    person = names_only.copy()
    person["id_persistent"] = test_id_persistent_0
    req = post_person(live_server.url, person, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"person with persistent_id {test_id_persistent_0} has no previous version."
    )


def test_no_id_version(auth_server, names_only):
    live_server, cookies = auth_server
    person = names_only.copy()
    person["version"] = 5
    req = post_person(live_server.url, person, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Person with display_txt {test_display_txt_0} has version but no persistent_id."
    )


def test_concurrent_modification(auth_server, names_only):
    live_server, cookies = auth_server
    person = names_only.copy()
    req = post_person(live_server.url, person, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["persons"][0]
    created["display_txt"] = "new test display txt"
    req = post_person(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    req = post_person(live_server.url, created, cookies=cookies)
    assert req.status_code == 400
    assert req.json()["msg"] == (
        "There has been a concurrent modification "
        "to the person with id_persistent "
        f'{created["id_persistent"]}.'
    )


def test_no_modification_is_returned(auth_server, names_only):
    live_server, cookies = auth_server
    req = post_person(live_server.url, names_only, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["persons"][0]
    req = post_person(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    persons = req.json()["persons"]
    assert len(persons) == 1
    assert persons[0] == created


def test_exists(auth_server, names_only):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.return_value = "same_id"
    with patch("cosmae.person.api.uuid4", mock):
        person = names_only.copy()
        req = post_person(live_server.url, person, cookies=cookies)
        assert req.status_code == 200
        req = post_person(live_server.url, person, cookies=cookies)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate an id for person with "
            f"display_txt {test_display_txt_0}."
        )


def test_bad_db(auth_server, names_only):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.person.models_django.Person.save", mock):
        req = post_person(live_server.url, names_only, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."


def test_not_signed_in(live_server, names_only):
    req = post_person(live_server.url, names_only, cookies=None)
    assert req.status_code == 401


def test_multiple(auth_server, names_only):
    live_server, cookies = auth_server
    count_before = Person.get_count()
    req = post_person(live_server.url, names_only, cookies=cookies)
    created = req.json()["persons"][0]
    new_display_txt = "new test display_text"
    created["display_txt"] = new_display_txt
    req = post_persons(live_server.url, [created, names_only], cookies=cookies)
    assert req.status_code == 200
    persons = req.json()["persons"]
    assert len(persons) == 2
    person_0 = persons[0]
    assert person_0["display_txt"] == new_display_txt
    assert person_0["version"] > created["version"]
    # also check for correct number of persons in DB.
    assert Person.get_count() - count_before == 2
