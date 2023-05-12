# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
import tests.contribution.common as c
from tests.user import common as cu
from cosmae.contribution.api import mk_initial_contribution_candidate
from cosmae.contribution.models_api import ContributionCandidate, ContributionPostRequest
from cosmae.contribution.models_conversion import contribution_db_to_api
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)


def test_initial_contribution(user):
    candidate_request = ContributionPostRequest(
        name=c.name_test0,
        description=c.description_test0,
        has_header=False,
        anonymous=True,
    )
    candidate_db = mk_initial_contribution_candidate(candidate_request, user)
    assert candidate_db.name == c.name_test0
    assert candidate_db.description == c.description_test0
    assert candidate_db.anonymous
    assert not candidate_db.has_header
    assert candidate_db.created_by == user
    assert candidate_db.state == ContributionCandidateDb.UPLOADED


def test_model_db_to_api_anonymous(contribution_user):
    contribution_api = contribution_db_to_api(contribution_user)
    assert contribution_api == ContributionCandidate(
        name=c.name_test0,
        description=c.description_test0,
        id_persistent=c.id_test0,
        anonymous=True,
        author=None,
        has_header=False,
        state="COLUMNS_ASSIGNED",
    )


def test_model_db_to_api(contribution_user):
    contribution_user.anonymous = False
    contribution_api = contribution_db_to_api(contribution_user)
    assert contribution_api == ContributionCandidate(
        name=c.name_test0,
        description=c.description_test0,
        id_persistent=c.id_test0,
        anonymous=False,
        author=cu.test_username,
        has_header=False,
        state="COLUMNS_ASSIGNED",
    )
