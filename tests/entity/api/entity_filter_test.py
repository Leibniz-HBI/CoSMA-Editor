# pylint:disable=no-member,unused-argument
"Tests for filtering entities via the API." ""
from requests import post

import tests.column.common as cc
import tests.entity.api.requests as r
from cosmae.entity.models_api import FilterClause, FilterComposite, FilterLiteral


def test_no_cookies(live_server):
    """Make sure that missing cookies result in not authenticated response"""
    rsp = post(
        live_server.url + "/cosmae/api/entities/filter",
        json={},
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_unauthenticated(request_no_user):
    """Make sure that unauthenticated requests are rejected."""
    status_code, _ = r.post_entity_filter(
        request_no_user,
        FilterClause(
            filter=FilterLiteral(
                id_column_persistent="test", value="test", predicate="EQ"
            )
        ),
    )
    assert status_code == 401


def test_applicant(request_applicant):
    """Make sure that applicants are forbidden from filtering entities."""
    status_code, _ = r.post_entity_filter(
        request_applicant,
        FilterClause(
            filter=FilterLiteral(
                id_column_persistent="test", value="test", predicate="EQ"
            )
        ),
    )
    assert status_code == 403


def test_literal_eq(request_user, entity0, entity1, values_user):
    """Test filtering entities with a simple literal filter."""
    status_code, rsp = r.post_entity_filter(
        request_user,
        FilterClause(
            filter=FilterLiteral(
                id_column_persistent=cc.id_column_persistent_test_user,
                value="value 1",
                predicate="EQ",
            )
        ),
    )
    assert status_code == 200
    entity_ids = rsp.dict()["id_entity_persistent_list"]
    assert entity_ids == [entity1.id_persistent]


def test_literal_neq(request_user, entity0, entity1, values_user):
    """Test filtering entities with a simple literal filter."""
    status_code, rsp = r.post_entity_filter(
        request_user,
        FilterClause(
            filter=FilterLiteral(
                id_column_persistent=cc.id_column_persistent_test_user,
                value="value 1",
                predicate="NEQ",
            )
        ),
    )
    assert status_code == 200
    entity_ids = rsp.dict()["id_entity_persistent_list"]
    assert len(entity_ids) == 2
    assert set(entity_ids) == {entity0.id_persistent, entity1.id_persistent}


def test_no_filter(request_user, entity0, entity1, values_user):
    """Test filtering entities with a simple literal filter."""
    status_code, rsp = r.post_entity_filter(
        request_user,
        None,
    )
    assert status_code == 200
    entity_ids = rsp.dict()["id_entity_persistent_list"]
    assert len(entity_ids) == 2
    assert set(entity_ids) == {entity0.id_persistent, entity1.id_persistent}


def test_composite_empty_set(request_user, entity0, entity1, values_user):
    """Test filtering entities with a simple literal filter."""
    status_code, rsp = r.post_entity_filter(
        request_user,
        FilterClause(
            filter=FilterComposite(
                operator="AND",
                parts=[
                    FilterClause(
                        filter=FilterLiteral(
                            id_column_persistent=cc.id_column_persistent_test_user,
                            value="value 1",
                            predicate="NEQ",
                        )
                    ),
                    FilterClause(
                        filter=FilterLiteral(
                            id_column_persistent=cc.id_column_persistent_test_user,
                            value="value 1",
                            predicate="EQ",
                        )
                    ),
                ],
            ),
        ),
    )
    assert status_code == 200
    entity_ids = rsp.dict()["id_entity_persistent_list"]
    assert entity_ids == []
