# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument,duplicate-code
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from requests import post

import tests.contribution.api.common as c
import tests.contribution.api.requests as req_contrib
import tests.user.common as cu
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.contribution.column.models_django import ColumnContribution
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.util.auth import CosmaeUser, NotAuthenticatedException


def test_no_cookies(auth_server):
    live_server, _ = auth_server
    rsp = post(
        live_server.url
        + "/cosmae/api/contributions/id-test/column_assignment_complete",
        cookies=None,
        timeout=900,
    )
    assert rsp.status_code == 401


def test_invalid_user(request_user):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with patch("cosmae.contribution.api.check_user", mock):
        status, _rsp = req_contrib.post_column_assignment_complete(
            request_user, "id-test"
        )
        assert status == 401


def test_404(request_user):
    status, _rsp = req_contrib.post_column_assignment_complete(
        request_user, str(uuid4())
    )
    assert status == 404


def test_wrong_user(request_user, request_user1):
    status, rsp = req_contrib.post_contribution(request_user, c.contribution_post0)
    assert status == 200
    id_persistent = rsp.dict()["id_persistent"]
    status, _rsp = req_contrib.post_column_assignment_complete(
        request_user1, id_persistent
    )
    assert status == 404


def test_accept_missing_display_txt(request_user, user):
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
    status, _rsp = req_contrib.post_column_assignment_complete(
        request_user, id_persistent
    )
    assert status == 200


def test_with_discarded_assignment(request_user):
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
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
    )
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent="None",
        index_in_file=1,
        discard=True,
    )

    status, _rsp = req_contrib.post_column_assignment_complete(
        request_user, id_contribution_persistent
    )
    assert status == 200


def test_incomplete_assignment(request_user):
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
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
        discard=False,
    )
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent="None",
        index_in_file=1,
        discard=False,
    )

    status, rsp = req_contrib.post_column_assignment_complete(
        request_user, id_contribution_persistent
    )
    assert status == 400
    assert (
        rsp.dict()["msg"]
        == "The following columns are neither discarded nor assigned to "
        "existing: column_test."
    )


def test_duplicate_assignment(request_user):
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
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
        discard=False,
    )
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent="display_txt",
        index_in_file=1,
        discard=False,
    )

    status, rsp = req_contrib.post_column_assignment_complete(
        request_user, id_contribution_persistent
    )
    assert status == 400
    assert (
        rsp.dict()["msg"] == "Assignment to existing columns has to be unique. Please "
        "check the following columns: name, column_test."
    )


def test_complete_assignment(request_user):
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
    id_column_persistent = str(uuid4())
    ColumnHistory.objects.create(  # pylint: disable=no-member
        name="column_test",
        id_parent_persistent=None,
        type=Column.BOOL,
        id_persistent=id_column_persistent,
        time_edit=datetime.now(),
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="name",
        id_existing_persistent="display_txt",
        index_in_file=0,
    )
    ColumnContribution.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=uuid4(),
        contribution_candidate=contribution_candidate,
        name="column_test",
        id_existing_persistent=id_column_persistent,
        index_in_file=1,
    )

    status, _rsp = req_contrib.post_column_assignment_complete(
        request_user, id_contribution_persistent
    )
    assert status == 200
