# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments,too-many-positional-arguments,duplicate-code
from uuid import uuid4

import tests.contribution.entity.api.requests as r
import tests.contribution.entity.common as c
import tests.entity.common as ce
from tests.utils import assert_versioned


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = r.get_score(
        live_server.url,
        "contribution_id",
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test,
    )
    assert rsp.status_code == 401


def test_no_candidate(auth_server):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        str(uuid4()),
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test,
        cookies=cookies,
    )
    assert rsp.status_code == 404


def test_unknown_contribution_entity(auth_server, contribution_candidate):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test,
        cookies,
    )
    assert rsp.status_code == 404
    assert rsp.json() == {"msg": "Contributed entity does not exist."}


def test_entity_not_part_of_contribution(auth_server, contribution_candidate, entity0):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        contribution_candidate.id_persistent,
        ce.id_persistent_test_0,
        ce.id_persistent_test,
        cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {"msg": "Entity is not part of the contribution."}


def test_no_existing_entity(auth_server, contribution_candidate, entity_duplicate):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test,
        cookies,
    )
    assert rsp.status_code == 404
    assert rsp.json() == {"msg": "No such existing entity."}


def test_invalid_existing_entity(auth_server, contribution_candidate, entity_duplicate):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        c.id_persistent_entity_duplicate_test,
        cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json() == {"msg": "Existing entity is not curated."}


def test_get_pair_similarity(
    auth_server,
    contribution_candidate,
    entities,
):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_0,
        cookies,
    )
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
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
    )


def test_get_pair_similarity_with_column_match(
    auth_server,
    contribution_candidate,
    entities,
    duplicate_assignment,
    values_match,
    column_merge_request,
):
    live_server, cookies = auth_server
    rsp = r.get_score(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_1,
        cookies,
    )
    assert rsp.status_code == 200
    assert_versioned(
        rsp.json(),
        {
            "entity": {
                "disabled": False,
                "display_txt": "test entity 1",
                "display_txt_details": "Display Text",
                "id_persistent": ce.id_persistent_test_1,
                "version": 2,
            },
            "id_match_column_persistent_list": ["2ec43995-338b-4f4b-b1cc-4bfc71466fc5"],
            "similarity": 0.9230769230769231,
        },
    )
