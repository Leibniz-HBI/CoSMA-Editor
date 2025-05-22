# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments,too-many-positional-arguments,duplicate-code
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


def match_sort_key(dictionary):
    return dictionary["entity"]["id_persistent"]


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
                            "similarity": 0.9230769230769231,
                            "id_match_column_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "Display Text",
                                "version": 1,
                                "id_persistent": ce.id_persistent_test_0,
                                "disabled": False,
                            },
                        },
                        {
                            "entity": {
                                "disabled": False,
                                "display_txt": "test entity 1",
                                "display_txt_details": "Display Text",
                                "id_persistent": ce.id_persistent_test_1,
                                "version": 2,
                            },
                            "id_match_column_persistent_list": [],
                            "similarity": 0.9230769230769231,
                        },
                    ],
                    "assigned_duplicate": None,
                }
            }
        },
        list_sort_key=match_sort_key,
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
                            "similarity": 0.9230769230769231,
                            "id_match_column_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "Display Text",
                                "version": 1,
                                "id_persistent": ce.id_persistent_test_0,
                                "disabled": False,
                            },
                        },
                        {
                            "entity": {
                                "disabled": False,
                                "display_txt": "test entity 1",
                                "display_txt_details": "Display Text",
                                "id_persistent": ce.id_persistent_test_1,
                                "version": 2,
                            },
                            "id_match_column_persistent_list": [],
                            "similarity": 0.9230769230769231,
                        },
                    ],
                    "assigned_duplicate": {
                        "entity": {
                            "id_persistent": ce.id_persistent_test_1,
                            "display_txt": ce.display_txt_test1,
                            "display_txt_details": "Display Text",
                            "version": entities[1].id,
                            "disabled": False,
                        },
                        "id_match_column_persistent_list": [],
                        "similarity": 0.9230769230769231,
                    },
                }
            }
        },
        list_sort_key=match_sort_key,
    )


def test_similar_entities_with_column_match(
    auth_server,
    contribution_candidate,
    entities,
    duplicate_assignment,
    values_match,
    column_merge_request,
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
                                "display_txt_details": "Display Text",
                                "id_persistent": ce.id_persistent_test_1,
                                "version": 2,
                            },
                            "id_match_column_persistent_list": [
                                "2ec43995-338b-4f4b-b1cc-4bfc71466fc5"
                            ],
                            "similarity": 0.9230769230769231,
                        },
                        {
                            "similarity": 0.9230769230769231,
                            "id_match_column_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "Display Text",
                                "version": 1,
                                "id_persistent": ce.id_persistent_test_0,
                                "disabled": False,
                            },
                        },
                    ],
                    "assigned_duplicate": {
                        "entity": {
                            "id_persistent": ce.id_persistent_test_1,
                            "display_txt": ce.display_txt_test1,
                            "display_txt_details": "Display Text",
                            "version": entities[1].id,
                            "disabled": False,
                        },
                        "similarity": 0.9230769230769231,
                        "id_match_column_persistent_list": [
                            "2ec43995-338b-4f4b-b1cc-4bfc71466fc5"
                        ],
                    },
                }
            }
        },
    )


def test_similar_entities_assigned_duplicate_no_match(
    auth_server,
    contribution_candidate,
    entities,
    duplicate_assignment_no_match,
    values_match,
    column_merge_request,
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
                                "id_persistent": c.id_persistent_entity_duplicate_no_match_test,
                                "display_txt": c.display_txt_test_entity_duplicate_no_match,
                                "display_txt_details": "Display Text",
                                "version": entities[3].id,
                                "disabled": False,
                            },
                            "similarity": 0.6153846153846154,
                            "id_match_column_persistent_list": [],
                        },
                        {
                            "entity": {
                                "disabled": False,
                                "display_txt": "test entity 1",
                                "display_txt_details": "Display Text",
                                "id_persistent": ce.id_persistent_test_1,
                                "version": 2,
                            },
                            "id_match_column_persistent_list": [
                                "2ec43995-338b-4f4b-b1cc-4bfc71466fc5"
                            ],
                            "similarity": 0.9230769230769231,
                        },
                        {
                            "similarity": 0.9230769230769231,
                            "id_match_column_persistent_list": [],
                            "entity": {
                                "display_txt": "test entity 0",
                                "display_txt_details": "Display Text",
                                "version": 1,
                                "id_persistent": ce.id_persistent_test_0,
                                "disabled": False,
                            },
                        },
                    ],
                    "assigned_duplicate": {
                        "entity": {
                            "id_persistent": c.id_persistent_entity_duplicate_no_match_test,
                            "display_txt": c.display_txt_test_entity_duplicate_no_match,
                            "display_txt_details": "Display Text",
                            "version": entities[3].id,
                            "disabled": False,
                        },
                        "similarity": 0.6153846153846154,
                        "id_match_column_persistent_list": [],
                    },
                }
            }
        },
    )
