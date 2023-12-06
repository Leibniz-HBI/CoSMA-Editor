# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from uuid import uuid4

import tests.contribution.entity.api.requests as r
import tests.contribution.entity.common as c


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = r.get_entities(live_server.url, "contribution_id", 0, 2)
    assert rsp.status_code == 401


def test_no_candidate(auth_server):
    live_server, cookies = auth_server
    rsp = r.get_entities(live_server.url, str(uuid4()), 0, 2, cookies)
    assert rsp.status_code == 404


def test_no_entities(auth_server, contribution_candidate):
    live_server, cookies = auth_server
    rsp = r.get_entities(
        live_server.url, contribution_candidate.id_persistent, 0, 2, cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {"persons": []}


def test_get_chunk(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.get_entities(
        live_server.url, contribution_candidate.id_persistent, 0, 2, cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json) == 1
    persons = json["persons"]
    assert len(persons) == 1
    person = persons[0]
    assert len(person) == 4
    assert person["id_persistent"] == c.id_persistent_entity_duplicate_test
    assert person["display_txt"] == c.display_txt_test_entity_duplicate
    assert not person["disabled"]
    assert "version" in person
