# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument

import pytest
from django.db.models.signals import post_save

import tests.contribution.common as c
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.contribution.tag_definition.queue import dispatch_read_csv_head

post_save.disconnect(
    dispatch_read_csv_head, ContributionCandidate, "cosmae.start_tag_extraction"
)


@pytest.fixture
def contribution_user(user):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_test0,
        description=c.description_test0,
        id_persistent=c.id_test0,
        has_header=False,
        file_name=c.file_name_test0,
        state=ContributionCandidate.COLUMNS_ASSIGNED,
        created_by=user,
    )


@pytest.fixture
def contribution_other(user1):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_test1,
        description=c.description_test1,
        id_persistent=c.id_test1,
        has_header=True,
        file_name=c.file_name_test1,
        state=ContributionCandidate.UPLOADED,
        created_by=user1,
    )


@pytest.fixture
def contribution_semicolon(user1):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_test1,
        description=c.description_test1,
        id_persistent=c.id_test1,
        has_header=True,
        file_name=c.file_name_test_semicolon,
        state=ContributionCandidate.UPLOADED,
        created_by=user1,
    )


@pytest.fixture
def contribution_error(user):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_error_test,
        description=c.description_error_test,
        id_persistent=c.id_persistent_error_test,
        has_header=False,
        file_name=c.file_name_test0,
        state=ContributionCandidate.ENTITIES_MATCHED,
        created_by=user,
        error_msg=c.msg_error_test,
        error_trace=c.trace_error_test,
    )


@pytest.fixture
def contribution_tag_def(contribution_user):
    return TagDefinitionContribution.objects.create(  # pylint:disable=no-member
        name=c.name_definition_test0,
        id_persistent=c.id_persistent_tag_def_test0,
        contribution_candidate=contribution_user,
        index_in_file=9000,
    )


@pytest.fixture
def contribution_tag_def_assigned(contribution_user, tag_def):
    return TagDefinitionContribution.objects.create(  # pylint:disable=no-member
        name=c.name_definition_test0,
        id_persistent=c.id_persistent_tag_def_test0,
        contribution_candidate=contribution_user,
        index_in_file=9000,
        id_existing_persistent=tag_def.id_persistent,
    )


@pytest.fixture
def contribution_tag_def_assigned_display_txt(contribution_user, tag_def):
    return TagDefinitionContribution.objects.create(  # pylint:disable=no-member
        name=c.name_definition_test0,
        id_persistent=c.id_persistent_tag_def_test0,
        contribution_candidate=contribution_user,
        index_in_file=9000,
        id_existing_persistent="display_txt",
    )


@pytest.fixture
def contribution_tag_def_1(contribution_user):
    return TagDefinitionContribution.objects.create(  # pylint:disable=no-member
        name=c.name_definition_test1,
        id_persistent=c.id_persistent_tag_def_test1,
        contribution_candidate=contribution_user,
        index_in_file=900,
        discard=False,
    )


@pytest.fixture
def contribution_tag_def_other(contribution_other):
    return TagDefinitionContribution.objects.create(  # pylint:disable=no-member
        name=c.name_definition_test1,
        id_persistent=c.id_persistent_tag_def_test1,
        contribution_candidate=contribution_other,
        index_in_file=900,
    )
