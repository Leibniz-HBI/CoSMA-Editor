# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

import tests.entity.common as ce
from tests.entity.api.integration.requests import post_chunk, post_persons


def test_empty_chunk(auth_server):
    live_server, cookies = auth_server
    rsp = post_chunk(live_server.url, 0, 20, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    assert len(json["entity_list"]) == 0
    assert json["next_offset"] == 0


def test_can_slice(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    persons = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
            "justification_txt": "justification",
        }
        for i in range(20)
    ]
    rsp = post_persons(live_server.url, persons, cookies=cookies)
    offset = rsp.json()["entity_list"][3]["version"]
    rsp = post_chunk(live_server.url, offset, 4, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    persons = json["entity_list"]
    assert len(persons) == 4
    for i in range(4):
        assert persons[i]["display_txt"] == f"{i+3}"
    assert json["next_offset"] == persons[-1]["version"] + 1


def test_can_slice_with_hidden(auth_server_commissioner):
    live_server, cookies = auth_server_commissioner
    entity_list = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
            "justification_txt": "justification",
        }
        for i in range(20)
    ]
    rsp = post_persons(live_server.url, entity_list, cookies=cookies)
    assert rsp.status_code == 200
    rsp_entity_list = rsp.json()["entity_list"]
    person4 = rsp_entity_list[4]
    person4["disabled"] = True
    offset = rsp_entity_list[3]["version"]
    rsp = post_persons(live_server.url, [person4], cookies=cookies)
    assert rsp.status_code == 200
    rsp = post_chunk(live_server.url, offset, 4, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    entity_list = json["entity_list"]
    assert [entity["display_txt"] for entity in entity_list] == ["3", "5", "6", "7"]
    assert json["next_offset"] == entity_list[-1]["version"] + 1


def test_non_existent_slice(auth_server):
    live_server, cookies = auth_server
    entity_list = [
        {
            "names_personal": "test personal",
            "names_family": "test family",
            "display_txt": f"{i}",
        }
        for i in range(2)
    ]
    post_persons(live_server.url, entity_list)
    rsp = post_chunk(live_server.url, 3, 4, cookies=cookies)
    assert rsp.status_code == 200
    json = rsp.json()
    entity_list = json["entity_list"]
    assert len(entity_list) == 0
    assert json["next_offset"] == 0


def test_slice_until_date(auth_server, entity0, entity1, entity1_changed, entity2):
    live_server, cookies = auth_server
    rsp = post_chunk(
        live_server.url, 0, 200, up_until_time=ce.time_edit_test_2, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    entity_list = json["entity_list"]
    assert len(entity_list) == 3
    entity = entity_list[1]
    assert entity["display_txt"] == ce.display_txt_test1


def test_request_too_large(auth_server):
    live_server, cookies = auth_server
    rsp = post_chunk(live_server.url, 0, 1001, cookies=cookies)
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Please specify limit smaller than 1000."


def test_not_signed_in(live_server):
    rsp = post_chunk(live_server.url, 0, 2, cookies=None)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server_applicant):
    live_server, cookies = auth_server_applicant
    rsp = post_chunk(live_server.url, 0, 2, cookies=cookies)
    assert rsp.status_code == 403
