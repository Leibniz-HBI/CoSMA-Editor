# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.entity.api.requests as r
import tests.contribution.entity.common as c
import tests.entity.common as ce


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
    assert rsp.json() == {"msg": "Entity does not exist."}


def test_similar_entities(auth_server, contribution_candidate, entities):
    similarMock = MagicMock()
    similarMock.return_value = [
        {
            "similarity": 0.95,
            "id_persistent": ce.id_persistent_test_0,
            "display_txt": ce.display_txt_test0,
            "id": 0,
        },
        {
            "similarity": 0.90,
            "id_persistent": ce.id_persistent_test_1,
            "display_txt": ce.display_txt_test1,
            "id": 1,
        },
    ]
    live_server, cookies = auth_server
    with patch("cosmae.contribution.entity.api.find_matches", similarMock):
        rsp = r.post_similar(
            live_server.url,
            contribution_candidate.id_persistent,
            [c.id_persistent_entity_duplicate_test],
            cookies,
        )
    assert rsp.status_code == 200
    assert rsp.json() == {
        "matches": {
            c.id_persistent_entity_duplicate_test: [
                {
                    "similarity": 0.95,
                    "entity": {
                        "id_persistent": ce.id_persistent_test_0,
                        "display_txt": ce.display_txt_test0,
                        "version": 0,
                    },
                },
                {
                    "similarity": 0.90,
                    "entity": {
                        "id_persistent": ce.id_persistent_test_1,
                        "display_txt": ce.display_txt_test1,
                        "version": 1,
                    },
                },
            ]
        }
    }
