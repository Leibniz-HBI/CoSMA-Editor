# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments,too-many-positional-arguments
from uuid import uuid4

import tests.contribution.entity.api.requests as r
import tests.contribution.entity.common as c
import tests.entity.common as ce
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import EntityJustification

justification = "justification for entity"


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = r.put_duplicate(
        live_server.url, "contribution_id", "id_origin", "id_destination", cookies=None
    )
    assert rsp.status_code == 401


def test_no_candidate(auth_server):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url, str(uuid4()), "id_origin", "id_destination", cookies=cookies
    )
    assert rsp.status_code == 404


def test_unknown_entities(auth_server, contribution_candidate):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        "id_origin",
        "id_destination",
        cookies=cookies,
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
        cookies=cookies,
    )
    assert rsp.status_code == 200
    duplicate = EntityDuplicate.objects.all().get()  # pylint: disable=no-member
    assert duplicate.id_origin_persistent == c.id_persistent_entity_duplicate_test
    assert duplicate.id_destination_persistent == ce.id_persistent_test_0


def test_put_none_no_justification(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        None,
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert len(EntityDuplicate.objects.all()) == 0  # pylint: disable=no-member


def test_put_none_with_justification(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        None,
        justification=justification,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    assert len(EntityDuplicate.objects.all()) == 0  # pylint: disable=no-member
    justification_db = EntityJustification.for_id_entity_persistent_unordered(
        c.id_persistent_entity_duplicate_test
    ).get()
    assert justification_db.text == justification


def test_keep_justification(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        None,
        justification=justification,
        keep_justification_for_all=True,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    assert len(EntityDuplicate.objects.all()) == 0  # pylint: disable=no-member
    justification_db = EntityJustification.for_id_entity_persistent_unordered(
        c.id_persistent_entity_duplicate_test
    ).get()
    assert justification_db.text == justification
    contribution = ContributionCandidate.by_id_persistent(
        contribution_candidate.id_persistent, contribution_candidate.created_by
    ).get()
    assert contribution.justification == justification


def test_uses_contribution_justification(auth_server, contribution_candidate, entities):
    contribution_candidate.justification = justification
    contribution_candidate.save()
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        None,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    assert len(EntityDuplicate.objects.all()) == 0  # pylint: disable=no-member
    justification_db = EntityJustification.for_id_entity_persistent_unordered(
        c.id_persistent_entity_duplicate_test
    ).get()
    assert justification_db.text == justification


def test_uses_entity_justification(auth_server, contribution_candidate, entities):
    EntityJustification.add(
        "72ae157a-75f8-46a6-a143-6548ea4ea91b",
        c.id_persistent_entity_duplicate_test,
        justification,
        c.time_edit_deduplication,
        contribution_candidate.created_by,
    )
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        None,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    assert len(EntityDuplicate.objects.all()) == 0  # pylint: disable=no-member
    justification_db = EntityJustification.for_id_entity_persistent_unordered(
        c.id_persistent_entity_duplicate_test
    ).get()
    assert justification_db.text == justification


def test_put_duplicate_removes_old(auth_server, contribution_candidate, entities):
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_0,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test,
        ce.id_persistent_test_1,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    duplicate = EntityDuplicate.objects.all().get()  # pylint: disable=no-member
    assert duplicate.id_origin_persistent == c.id_persistent_entity_duplicate_test
    assert duplicate.id_destination_persistent == ce.id_persistent_test_1


def test_no_duplicate_assignment(
    auth_server,
    contribution_candidate,
    entity1,
    entity_duplicate,
    entity_duplicate1,
    duplicate_assignment,
):
    "Make sure no two contributed entities are assigned to the same destination entity."
    live_server, cookies = auth_server
    rsp = r.put_duplicate(
        live_server.url,
        contribution_candidate.id_persistent,
        c.id_persistent_entity_duplicate_test1,
        ce.id_persistent_test_1,
        cookies=cookies,
    )
    assert rsp.status_code == 400
    json = rsp.json()
    assert (
        json["msg"]
        == "Destination entity is already assigned to another row from the contribution."
    )
