# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

from tests.person.api.integration.requests import post_chunk, post_persons


def test_empty_chunk(live_server):
    rsp = post_chunk(live_server.url, 0, 20)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json["persons"]) == 0


def test_can_slice(live_server):
    persons = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
        }
        for i in range(20)
    ]
    post_persons(live_server.url, persons)
    rsp = post_chunk(live_server.url, 3, 4)
    assert rsp.status_code == 200
    persons = rsp.json()["persons"]
    assert len(persons) == 4
    for i in range(4):
        assert persons[i]["display_txt"] == f"{i+3}"


def test_non_existent_slice(live_server):
    persons = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
        }
        for i in range(2)
    ]
    post_persons(live_server.url, persons)
    rsp = post_chunk(live_server.url, 3, 4)
    assert rsp.status_code == 200
    persons = rsp.json()["persons"]
    assert len(persons) == 0


def test_request_too_large(live_server):
    rsp = post_chunk(live_server.url, 0, 1001)
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Please specify limit smaller than 1000."


def test_bad_db(live_server):
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.person.models_django.Person.get_most_recent_chunked", mock):
        rsp = post_chunk(live_server.url, 0, 2)
    assert rsp.status_code == 500
    assert rsp.json()["msg"] == "Could not get requested chunk."
