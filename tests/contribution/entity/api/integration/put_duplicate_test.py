# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from uuid import uuid4

import tests.contribution.entity.api.requests as r
import tests.contribution.entity.common as c
import tests.entity.common as ce
from cosmae.contribution.entity.models_django import EntityDuplicate


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = r.put_duplicate(
        live_server.url, "contribution_id", "id_origin", "id_destination", []
    )
    assert rsp.status_code == 401


def test_no_candidate(auth_server):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url, str(uuid4()), "id_origin", "id_destination", cookies
    )
    assert rsp.status_code == 404


def test_unknown_entities(auth_server, contribution_candidate):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        "id_origin",
        "id_destination",
        cookies,
    )
    assert rsp.status_code == 404
    assert rsp.json() == {"msg": "One of the entities does not exist."}


def test_put_duplicate(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_0,
        cookies,
    )
    assert rsp.status_code == 200
    duplicate = EntityDuplicate.objects.all().get()  # pylint: disable=no-member
    assert duplicate.id_origin_persistent == c.id_persistent_entity_duplicate_test
    assert duplicate.id_destination_persistent == ce.id_persistent_test_0


def test_put_duplicate_removes_old(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_0,
        cookies,
    )
    assert rsp.status_code == 200
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_1,
        cookies,
    )
    assert rsp.status_code == 200
    duplicate = EntityDuplicate.objects.all().get()  # pylint: disable=no-member
    assert duplicate.id_origin_persistent == c.id_persistent_entity_duplicate_test
    assert duplicate.id_destination_persistent == ce.id_persistent_test_1
