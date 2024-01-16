# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments
from uuid import uuid4

import tests.contribution.entity.api.requests as r
import tests.contribution.entity.common as c
import tests.entity.common as ce
from tests.utils import assert_versioned


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = r.post_similar(live_server.url, "contribution_id", [])
    assert rsp.status_code == 401


def test_no_candidate(auth_server):
    live_server, cookies = auth_server
    rsp = r.post_similar(live_server.url, str(uuid4()), [], cookies)
    assert rsp.status_code == 404


def test_no_entities(auth_server, contribution_candidate):
    live_server, cookies = auth_server
    rsp = r.post_similar(
        live_server.url, contribution_candidate.id_persistent, [], cookies
    )
    assert rsp.status_code == 200
    assert rsp.json() == {"matches": {}}


def test_unknown_entities(auth_server, contribution_candidate):
    live_server, cookies = auth_server
    rsp = r.post_similar(
        live_server.url,
        contribution_candidate.id_persistent,
        ["some_entity_id"],
        cookies,
    )
    assert rsp.status_code == 404
    assert rsp.json() == {
        "msg": "Some entities are not part of the contribution candidate."
    }


def test_similar_entities_no_duplicate(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.post_similar(
        live_server.url,
        contribution_candidate.id_persistent,
        [c.id_persistent_entity_duplicate_test],
        cookies,
    )
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
        {
            "matches": {
                c.id_persistent_entity_duplicate_test: {
                    "matches": [
                        {
                            "entity": {
                                "disabled": False,
                                "display_txt": "test entity 1",
                                "display_txt_details": "display_txt",
                                "id_persistent": "id_persistent_test_1",
                                "version": 2,
                            },
                            "id_match_tag_definition_persistent_list": [],
                            "similarity": 0.9230769230769231,
                        },
                        {
                            "similarity": 0.9230769230769231,
                            "id_match_tag_definition_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "display_txt",
                                "version": 1,
                                "id_persistent": "id_persistent_test_0",
                                "disabled": False,
                            },
                        },
                    ],
                    "assigned_duplicate": None,
                }
            }
        },
    )


def test_similar_entities_with_duplicate(
    auth_server, contribution_candidate, entities, duplicate_assignment
):
    live_server, cookies = auth_server
    rsp = r.post_similar(
        live_server.url,
        contribution_candidate.id_persistent,
        [c.id_persistent_entity_duplicate_test],
        cookies,
    )
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
        {
            "matches": {
                c.id_persistent_entity_duplicate_test: {
                    "matches": [
                        {
                            "entity": {
                                "disabled": False,
                                "display_txt": "test entity 1",
                                "display_txt_details": "display_txt",
                                "id_persistent": "id_persistent_test_1",
                                "version": 2,
                            },
                            "id_match_tag_definition_persistent_list": [],
                            "similarity": 0.9230769230769231,
                        },
                        {
                            "similarity": 0.9230769230769231,
                            "id_match_tag_definition_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "display_txt",
                                "version": 1,
                                "id_persistent": "id_persistent_test_0",
                                "disabled": False,
                            },
                        },
                    ],
                    "assigned_duplicate": {
                        "id_persistent": ce.id_persistent_test_1,
                        "display_txt": ce.display_txt_test1,
                        "display_txt_details": "display_txt",
                        "version": entities[1].id,
                        "disabled": False,
                    },
                }
            }
        },
    )


def test_similar_entities_with_tag_match(
    auth_server,
    contribution_candidate,
    entities,
    duplicate_assignment,
    tag_instances_match,
    tag_merge_request,
):
    live_server, cookies = auth_server
    rsp = r.post_similar(
        live_server.url,
        contribution_candidate.id_persistent,
        [c.id_persistent_entity_duplicate_test],
        cookies,
    )
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
        {
            "matches": {
                c.id_persistent_entity_duplicate_test: {
                    "matches": [
                        {
                            "entity": {
                                "disabled": False,
                                "display_txt": "test entity 1",
                                "display_txt_details": "display_txt",
                                "id_persistent": "id_persistent_test_1",
                                "version": 2,
                            },
                            "id_match_tag_definition_persistent_list": [
                                "52d5de0a-2fdb-457f-80d0-6e10131ad1b9"
                            ],
                            "similarity": 0.9230769230769231,
                        },
                        {
                            "similarity": 0.9230769230769231,
                            "id_match_tag_definition_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "display_txt",
                                "version": 1,
                                "id_persistent": "id_persistent_test_0",
                                "disabled": False,
                            },
                        },
                    ],
                    "assigned_duplicate": {
                        "id_persistent": ce.id_persistent_test_1,
                        "display_txt": ce.display_txt_test1,
                        "display_txt_details": "display_txt",
                        "version": entities[1].id,
                        "disabled": False,
                    },
                }
            }
        },
    )
