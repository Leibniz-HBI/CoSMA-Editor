# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import pytest

import tests.merge_request.common as c
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.merge_request.models_django import MergeRequest
from cosmae.tag.models_django import TagDefinition


@pytest.fixture
def destination_tag_def_for_mr(db, user):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_destination,
        id_persistent=c.id_persistent_tag_def_destination,
        type=TagDefinition.FLOAT,
        time_edit=c.time_tag_def_destination,
        owner=user,
    )


@pytest.fixture
def origin_tag_def_for_mr(db, user1):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_origin,
        id_persistent=c.id_persistent_tag_def_origin,
        type=TagDefinition.FLOAT,
        time_edit=c.time_tag_def_origin,
        owner=user1,
    )


@pytest.fixture
def contribution_for_mr(db, user1):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_contribution,
        description=c.description_contribution,
        id_persistent=c.id_persistent_contribution,
        anonymous=True,
        has_header=True,
        created_by=user1,
        file_name="tmp_file.csv",
    )


@pytest.fixture
def merge_request_user(
    db, origin_tag_def_for_mr, destination_tag_def_for_mr, contribution_for_mr
):
    return MergeRequest.objects.create(  # pylint: disable=no-member
        id_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_destination_persistent=destination_tag_def_for_mr.id_persistent,
        created_by=origin_tag_def_for_mr.owner,
        assigned_to=destination_tag_def_for_mr.owner,
        created_at=c.time_merge_request,
        id_persistent=c.id_persistent_merge_request,
        contribution_candidate=contribution_for_mr,
    )


@pytest.fixture
def destination_tag_def_for_mr1(db, user1):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_destination1,
        id_persistent=c.id_persistent_tag_def_destination1,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_destination1,
        owner=user1,
    )


@pytest.fixture
def origin_tag_def_for_mr1(db, user):
    return TagDefinition.objects.create(  # pylint: disable=no-member
        name=c.name_tag_def_origin1,
        id_persistent=c.id_persistent_tag_def_origin1,
        type=TagDefinition.STRING,
        time_edit=c.time_tag_def_origin1,
        owner=user,
    )


@pytest.fixture
def contribution_for_mr1(db, user):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        name=c.name_contribution1,
        description=c.description_contribution1,
        id_persistent=c.id_persistent_contribution1,
        anonymous=True,
        has_header=True,
        created_by=user,
        file_name="tmp_file.csv",
    )


@pytest.fixture
def merge_request_user1(
    db, destination_tag_def_for_mr1, origin_tag_def_for_mr1, contribution_for_mr1
):
    return MergeRequest.objects.create(  # pylint: disable=no-member
        id_destination_persistent=destination_tag_def_for_mr1.id_persistent,
        id_origin_persistent=origin_tag_def_for_mr1.id_persistent,
        created_by=origin_tag_def_for_mr1.owner,
        assigned_to=destination_tag_def_for_mr1.owner,
        created_at=c.time_merge_request1,
        id_persistent=c.id_persistent_merge_request1,
        contribution_candidate=contribution_for_mr1,
    )
