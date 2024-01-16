# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

import pytest
from django.db import IntegrityError

from tests.person.api.integration.requests import post_person, post_persons
from cosmae.entity.models_django import Entity

test_display_txt_0 = "test display text 0"
test_id_persistent_0 = "test_id_0"


@pytest.fixture
def display_txt_only():
    return {
        "display_txt": test_display_txt_0,
    }


def test_no_cookies(auth_server, display_txt_only):
    live_server, _ = auth_server
    person = display_txt_only.copy()
    person["id_persistent"] = test_id_persistent_0
    req = post_person(live_server.url, person)
    assert req.status_code == 401


def test_insufficient_permissions(auth_server, display_txt_only):
    live_server, cookies = auth_server
    person = display_txt_only.copy()
    person["id_persistent"] = test_id_persistent_0
    req = post_person(live_server.url, person, cookies=cookies)
    assert req.status_code == 403
    assert req.json()["msg"] == "Insufficient Permissions"


def test_id_no_version(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    person = display_txt_only.copy()
    person["id_persistent"] = test_id_persistent_0
    req = post_person(live_server.url, person, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"person with persistent_id {test_id_persistent_0} has no previous version."
    )


def test_no_id_version(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    person = display_txt_only.copy()
    person["version"] = 5
    req = post_person(live_server.url, person, cookies=cookies)
    assert req.status_code == 400
    assert (
        req.json()["msg"]
        == f"Person with display_txt {test_display_txt_0} has version but no persistent_id."
    )


def test_concurrent_modification(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    person = display_txt_only.copy()
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


def test_no_modification_is_returned(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    req = post_person(live_server.url, display_txt_only, cookies=cookies)
    assert req.status_code == 200
    created = req.json()["persons"][0]
    req = post_person(live_server.url, created, cookies=cookies)
    assert req.status_code == 200
    persons = req.json()["persons"]
    assert len(persons) == 1
    assert persons[0] == created


def test_exists(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    mock = MagicMock()
    mock.return_value = "same_id"
    with patch("cosmae.person.api.uuid4", mock):
        person = display_txt_only.copy()
        req = post_person(live_server.url, person, cookies=cookies)
        assert req.status_code == 200
        req = post_person(live_server.url, person, cookies=cookies)
        assert req.status_code == 500
        assert req.json()["msg"] == (
            "Could not generate an id for person with "
            f"display_txt {test_display_txt_0}."
        )


def test_bad_db(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.entity.models_django.Entity.save", mock):
        req = post_person(live_server.url, display_txt_only, cookies=cookies)
    assert req.status_code == 500
    assert req.json()["msg"] == "Provided data not consistent with database."


def test_not_signed_in(live_server, display_txt_only):
    req = post_person(live_server.url, display_txt_only, cookies=None)
    assert req.status_code == 401


def test_multiple(auth_server_commissioner, display_txt_only):
    live_server, cookies = auth_server_commissioner
    count_before = len(Entity.most_recent(Entity.objects))  # pylint: disable=no-member
    req = post_person(live_server.url, display_txt_only, cookies=cookies)
    created = req.json()["persons"][0]
    new_display_txt = "new test display_text"
    created["display_txt"] = new_display_txt
    req = post_persons(live_server.url, [created, display_txt_only], cookies=cookies)
    assert req.status_code == 200
    persons = req.json()["persons"]
    assert len(persons) == 2
    person_0 = persons[0]
    assert person_0["display_txt"] == new_display_txt
    assert person_0["version"] > created["version"]
    # also check for correct number of persons in DB.
    assert (
        len(Entity.most_recent(Entity.objects))  # pylint: disable=no-member
        - count_before
        == 2
    )


def test_no_display_txt(auth_server_commissioner):
    server, cookies = auth_server_commissioner
    rsp = post_person(server.url, {}, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    persons = json["persons"]
    assert len(persons) == 1
    person = persons[0]
    id_persistent = person["id_persistent"]
    assert person["display_txt"] == id_persistent
    assert person["display_txt_details"] == "id_persistent"
    entity = Entity.most_recent_by_id(id_persistent)
    assert entity.id_persistent == id_persistent
    assert entity.display_txt is None
