# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
import tests.user.common as cu
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.util.auth import NotAuthenticatedException, CosmaeUser


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, "id-test", {"name": "new name"}
    )
    assert rsp.status_code == 401


def test_invalid_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        live_server, cookies = auth_server
        rsp = req_contrib.post_column_assignment_complete(
            live_server.url, "id-test", cookies=cookies
        )
        assert rsp.status_code == 401


def test_404(auth_server):
    live_server, cookies = auth_server
    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, str(uuid4()), cookies=cookies
    )
    assert rsp.status_code == 404


def test_wrong_user(auth_server1):
    live_server, cookies0, cookies1 = auth_server1
    rsp = req_contrib.post_contribution(
        live_server.url, c.contribution_post0, cookies=cookies0
    )
    assert rsp.status_code == 200
    id_persistent = rsp.json()["id_persistent"]
    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, id_persistent, cookies=cookies1
    )
    assert rsp.status_code == 404


def test_accept_missing_display_txt(auth_server, user):
    live_server, cookies = auth_server
    id_persistent = str(uuid4())
    ContributionCandidate.objects.create(  # pylint: disable=no-member
        id_persistent=id_persistent,
        name="contribution test",
        description="contribution candidate for test",
        state=ContributionCandidate.COLUMNS_EXTRACTED,
        has_header=False,
        file_name="file-test.csv",
        created_by=user,
    )
    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200


def test_with_discarded_assignment(auth_server):
    live_server, cookies = auth_server
    id_contribution_persistent = uuid4()
    contribution_candidate = (
        ContributionCandidate.objects.create(  # pylint: disable=no-member
            name="contribution_candidate_test",
            id_persistent=id_contribution_persistent,
            description="A contribution candidate for tests",
            has_header=False,
            file_name="test.csv",
            state=ContributionCandidate.COLUMNS_EXTRACTED,
            created_by=CosmaeUser.objects.get(username=cu.test_username),
        )
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent="None",
        index_in_file=1,
        discard=True,
    )

    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, id_contribution_persistent, cookies=cookies
    )
    assert rsp.status_code == 200


def test_incomplete_assignment(auth_server):
    live_server, cookies = auth_server
    id_contribution_persistent = uuid4()
    contribution_candidate = (
        ContributionCandidate.objects.create(  # pylint: disable=no-member
            name="contribution_candidate_test",
            id_persistent=id_contribution_persistent,
            description="A contribution candidate for tests",
            has_header=False,
            file_name="test.csv",
            state=ContributionCandidate.COLUMNS_EXTRACTED,
            created_by=CosmaeUser.objects.get(username=cu.test_username),
        )
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
        discard=False,
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent="None",
        index_in_file=1,
        discard=False,
    )

    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, id_contribution_persistent, cookies=cookies
    )
    assert rsp.status_code == 400
    assert (
        rsp.json()["msg"] == "The following tags are neither discarded nor assigned to "
        "existing: column_test."
    )


def test_duplicate_assignment(auth_server):
    live_server, cookies = auth_server
    id_contribution_persistent = uuid4()
    contribution_candidate = (
        ContributionCandidate.objects.create(  # pylint: disable=no-member
            name="contribution_candidate_test",
            id_persistent=id_contribution_persistent,
            description="A contribution candidate for tests",
            has_header=False,
            file_name="test.csv",
            state=ContributionCandidate.COLUMNS_EXTRACTED,
            created_by=CosmaeUser.objects.get(username=cu.test_username),
        )
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
        discard=False,
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent="display_txt",
        index_in_file=1,
        discard=False,
    )

    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, id_contribution_persistent, cookies=cookies
    )
    assert rsp.status_code == 400
    assert (
        rsp.json()["msg"] == "Assignment to existing tags has to be unique. Please "
        "check the following tags: name, column_test."
    )


def test_complete_assignment(auth_server):
    live_server, cookies = auth_server
    id_contribution_persistent = uuid4()
    user = CosmaeUser.objects.get(username=cu.test_username)
    contribution_candidate = (
        ContributionCandidate.objects.create(  # pylint: disable=no-member
            name="contribution_candidate_test",
            id_persistent=id_contribution_persistent,
            description="A contribution candidate for tests",
            has_header=False,
            file_name="test.csv",
            state=ContributionCandidate.COLUMNS_EXTRACTED,
            created_by=user,
        )
    )
    id_tag_definition_persistent = str(uuid4())
    ColumnHistory.objects.create(  # pylint: disable=no-member
        name="tag definition_test",
        id_parent_persistent=None,
        type=Column.BOOL,
        id_persistent=id_tag_definition_persistent,
        time_edit=datetime.now(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
    )
    TagDefinitionContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent=id_tag_definition_persistent,
        index_in_file=1,
    )

    rsp = req_contrib.post_column_assignment_complete(
        live_server.url, id_contribution_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
