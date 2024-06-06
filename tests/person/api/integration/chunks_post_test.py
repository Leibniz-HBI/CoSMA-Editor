# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

from tests.person.api.integration.requests import post_chunk, post_persons


def test_empty_chunk(auth_server):
    live_server, cookies = auth_server
    rsp = post_chunk(live_server.url, 0, 20, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json["persons"]) == 0


def test_can_slice(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    persons = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
            "reason_txt": "reason",
        }
        for i in range(20)
    ]
    post_persons(live_server.url, persons, cookies=cookies)
    rsp = post_chunk(live_server.url, 3, 4, cookies=cookies)
    assert rsp.status_code == 200
    persons = rsp.json()["persons"]
    assert len(persons) == 4
    for i in range(4):
        assert persons[i]["display_txt"] == f"{i+3}"


def test_can_slice_with_hidden(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    persons = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
            "reason_txt": "reason",
        }
        for i in range(20)
    ]
    rsp = post_persons(live_server.url, persons, cookies=cookies)
    assert rsp.status_code == 200
    person4 = rsp.json()["persons"][4]
    person4["disabled"] = True
    rsp = post_persons(live_server.url, [person4], cookies=cookies)
    assert rsp.status_code == 200
    rsp = post_chunk(live_server.url, 3, 4, cookies=cookies)
    assert rsp.status_code == 200
    persons = rsp.json()["persons"]
    assert [person["display_txt"] for person in persons] == ["3", "5", "6", "7"]


def test_non_existent_slice(auth_server):
    live_server, cookies = auth_server
    persons = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
        }
        for i in range(2)
    ]
    post_persons(live_server.url, persons)
    rsp = post_chunk(live_server.url, 3, 4, cookies=cookies)
    assert rsp.status_code == 200
    persons = rsp.json()["persons"]
    assert len(persons) == 0


def test_request_too_large(auth_server):
    live_server, cookies = auth_server
    rsp = post_chunk(live_server.url, 0, 1001, cookies=cookies)
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Please specify limit smaller than 1000."


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.entity.models_django.Entity.get_most_recent_chunked", mock):
        rsp = post_chunk(live_server.url, 0, 2, cookies=cookies)
    assert rsp.status_code == 500
    assert rsp.json()["msg"] == "Could not get requested chunk."


def test_not_signed_in(live_server):
    rsp = post_chunk(live_server.url, 0, 2, cookies=None)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    live_server, cookies = auth_server_applicant
    rsp = post_chunk(live_server.url, 0, 2, cookies=cookies)
    assert rsp.status_code == 403
