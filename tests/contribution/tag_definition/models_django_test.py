# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution


def test_ignore_users(contribution_column, contribution_column_other):
    assert list(
        TagDefinitionContribution.get_by_candidate_query_set(
            contribution_column.contribution_candidate
        )
    ) == [contribution_column]


def test_empty(contribution_user):
    assert not TagDefinitionContribution.get_by_candidate_query_set(contribution_user)
