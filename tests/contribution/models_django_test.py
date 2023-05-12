# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument
import tests.contribution.common as c
from cosmae.contribution.models_django import ContributionCandidate


def test_empty_chunk(user):
    ret = ContributionCandidate.chunk_for_user(user, 2, 100)
    assert not list(ret)


def test_filters_user(user, contribution_user, contribution_other):
    assert len(ContributionCandidate.chunk_for_user(user, 0, 100)) == 1


def test_change_description(user, contribution_user):
    ContributionCandidate.update(
        contribution_user.id_persistent, user, **{"description": c.description_test1}
    )
    candidate = ContributionCandidate.by_id_persistent(
        contribution_user.id_persistent, user
    ).get()
    assert candidate.description == c.description_test1


def test_change_name(user, contribution_user):
    ContributionCandidate.update(
        contribution_user.id_persistent, user, **{"name": c.name_test1}
    )
    candidate = ContributionCandidate.by_id_persistent(
        contribution_user.id_persistent, user
    ).get()
    assert candidate.name == c.name_test1
