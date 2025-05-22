# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code,too-many-arguments,too-many-positional-arguments
from unittest.mock import MagicMock, patch

import pytest

import tests.column.common as cc
import tests.value.api.integration.requests as req
import tests.value.common as cv
from tests.entity import common as ce
from tests.utils import assert_versioned
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ColumnMergeRequest


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = req.post_values_for_entities(live_server.url, [], [])
    assert rsp.status_code == 401


def test_invalid_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.value.api.check_user", mock):
        live_server, cookies = auth_server
        rsp = req.post_values_for_entities(live_server.url, [], [], cookies=cookies)
        assert rsp.status_code == 401


def test_empty_200(auth_server):
    live_server, cookies = auth_server
    rsp = req.post_values_for_entities(live_server.url, [], [], cookies=cookies)
    assert rsp.status_code == 200


def test_empty_entities_200(auth_server):
    live_server, cookies = auth_server
    rsp = req.post_values_for_entities(
        live_server.url, [ce.id_persistent_test_0], [], cookies=cookies
    )
    assert rsp.status_code == 200


def test_empty_columns_200(auth_server):
    live_server, cookies = auth_server
    rsp = req.post_values_for_entities(
        live_server.url, [], [cc.id_column_persistent_test], cookies=cookies
    )
    assert rsp.status_code == 200


@pytest.mark.django_db
def test_get_multiple(
    auth_server, column_user, column_user1, entity0, entity1, values_user
):
    live_server, cookies = auth_server
    rsp = req.post_values_for_entities(
        live_server.url,
        [ce.id_persistent_test_0, ce.id_persistent_test_1],
        [cc.id_column_persistent_test_user, cc.id_column_persistent_test_user1],
        cookies=cookies,
    )
    assert rsp.status_code == 200
    json = rsp.json()
    value_responses = json["value_responses"]
    assert value_responses[0]["id_entity_persistent"] == ce.id_persistent_test_0
    assert (
        value_responses[0]["id_column_persistent"] == cc.id_column_persistent_test_user
    )
    assert (
        value_responses[0]["id_column_requested_persistent"]
        == cc.id_column_persistent_test_user
    )
    assert value_responses[0]["id_persistent"] == cv.id_instance_test0
    assert value_responses[0]["is_existing"]
    assert value_responses[0]["value"] == "value"
    assert "version" in value_responses[0]
    assert value_responses[1]["id_entity_persistent"] == ce.id_persistent_test_1
    assert (
        value_responses[1]["id_column_persistent"] == cc.id_column_persistent_test_user
    )
    assert (
        value_responses[1]["id_column_requested_persistent"]
        == cc.id_column_persistent_test_user
    )
    assert value_responses[1]["id_persistent"] == cv.id_instance_test1
    assert value_responses[1]["is_existing"]
    assert value_responses[1]["value"] == "value 1"
    assert "version" in value_responses[1]
    assert value_responses[2]["id_entity_persistent"] == ce.id_persistent_test_0
    assert (
        value_responses[2]["id_column_persistent"] == cc.id_column_persistent_test_user1
    )
    assert (
        value_responses[2]["id_column_requested_persistent"]
        == cc.id_column_persistent_test_user1
    )
    assert value_responses[2]["id_persistent"] == cv.id_instance_test2
    assert value_responses[2]["is_existing"]
    assert value_responses[2]["value"] == "value 2"
    assert "version" in value_responses[2]
    assert value_responses[3]["id_entity_persistent"] == ce.id_persistent_test_1
    assert (
        value_responses[3]["id_column_persistent"] == cc.id_column_persistent_test_user1
    )
    assert (
        value_responses[3]["id_column_requested_persistent"]
        == cc.id_column_persistent_test_user1
    )
    assert value_responses[3]["id_persistent"] == cv.id_instance_test3
    assert value_responses[3]["is_existing"]
    assert value_responses[3]["value"] == "value 3"
    assert "version" in value_responses[3]


@pytest.fixture
def merge_request(user, user1):
    mr = ColumnMergeRequest(
        id_origin_persistent=cc.id_column_persistent_test_user1,
        id_destination_persistent=cc.id_column_persistent_test_user,
        state=ColumnMergeRequest.OPEN,
        id_persistent=cc.id_merge_request,
        created_at=cc.time_created_merge_request,
        created_by=user,
        assigned_to=user1,
    )
    mr.save()
    return mr


@pytest.mark.django_db
def test_related_by_merge_request(
    auth_server,
    column_user,
    column_user1,
    entity0,
    entity1,
    values_user,
    merge_request,
):
    live_server, cookies = auth_server
    rsp = req.post_values_for_entities(
        live_server.url,
        [ce.id_persistent_test_0, ce.id_persistent_test_1],
        [cc.id_column_persistent_test_user],
        id_merge_request_persistent=cc.id_merge_request,
        cookies=cookies,
    )

    assert rsp.status_code == 200
    json = rsp.json()
    assert_versioned(
        json["value_responses"],
        [
            {
                "id_entity_persistent": ce.id_persistent_test_0,
                "id_column_persistent": cc.id_column_persistent_test_user,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test0,
                "is_existing": True,
                "value": "value",
            },
            {
                "id_entity_persistent": ce.id_persistent_test_1,
                "id_column_persistent": cc.id_column_persistent_test_user,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test1,
                "is_existing": True,
                "value": "value 1",
            },
            {
                "id_entity_persistent": ce.id_persistent_test_0,
                "id_column_persistent": cc.id_column_persistent_test_user1,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test2,
                "is_existing": False,
                "value": "value 2",
            },
            {
                "id_entity_persistent": ce.id_persistent_test_1,
                "id_column_persistent": cc.id_column_persistent_test_user1,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test3,
                "is_existing": False,
                "value": "value 3",
            },
        ],
    )


@pytest.mark.django_db
def test_related_by_contribution(
    auth_server,
    column_user,
    column_user1,
    entity0,
    entity1,
    values_user,
    merge_request,
):
    contribution = ContributionCandidate(
        name="contribution test",
        description="contribution for tests used for getting entities",
        id_persistent=cc.id_contribution,
        has_header=False,
        created_by=column_user.owner,
        file_name="",
        state=ContributionCandidate.ENTITIES_ASSIGNED,
    )
    contribution.save()
    merge_request.contribution_candidate = contribution
    merge_request.save()
    live_server, cookies = auth_server
    rsp = req.post_values_for_entities(
        live_server.url,
        [ce.id_persistent_test_0, ce.id_persistent_test_1],
        [cc.id_column_persistent_test_user],
        id_contribution_persistent=cc.id_contribution,
        cookies=cookies,
    )

    assert rsp.status_code == 200
    json = rsp.json()
    value_responses = json["value_responses"]
    assert_versioned(
        value_responses,
        [
            {
                "id_entity_persistent": ce.id_persistent_test_0,
                "id_column_persistent": cc.id_column_persistent_test_user,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test0,
                "is_existing": True,
                "value": "value",
            },
            {
                "id_entity_persistent": ce.id_persistent_test_1,
                "id_column_persistent": cc.id_column_persistent_test_user,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test1,
                "is_existing": True,
                "value": "value 1",
            },
            {
                "id_entity_persistent": ce.id_persistent_test_0,
                "id_column_persistent": cc.id_column_persistent_test_user1,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test2,
                "is_existing": False,
                "value": "value 2",
            },
            {
                "id_entity_persistent": ce.id_persistent_test_1,
                "id_column_persistent": cc.id_column_persistent_test_user1,
                "id_column_requested_persistent": cc.id_column_persistent_test_user,
                "id_persistent": cv.id_instance_test3,
                "is_existing": False,
                "value": "value 3",
            },
        ],
    )
