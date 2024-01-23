# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import pytest

import tests.contribution.entity.common as c
import tests.entity.common as ce
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagInstanceHistory


@pytest.fixture
def entity_duplicate(contribution_candidate):
    entity_duplicate = Entity(
        id_persistent=c.id_persistent_entity_duplicate_test,
        display_txt=c.display_txt_test_entity_duplicate,
        time_edit=c.time_edit_test_duplicate,
        contribution_candidate=contribution_candidate,
    )
    entity_duplicate.save()
    return entity_duplicate


@pytest.fixture
def entities(entity0, entity1, entity_duplicate):
    return [entity0, entity1, entity_duplicate]


@pytest.fixture
def contribution_candidate(user):
    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        id_persistent="dcd2d28e-22f7-4bbe-92f7-d22a2eccc7ff",
        name="contribution candidate duplicate entity test",
        description="A contribution candidate used in tests for removing duplicate entities",
        has_header=True,
        created_by=user,
        file_name="unknown.csv",
        state=ContributionCandidate.VALUES_EXTRACTED,
    )


@pytest.fixture()
def duplicate_assignment(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        id_destination_persistent=ce.id_persistent_test_1,
        contribution_candidate=contribution_candidate,
    )


@pytest.fixture()
def tag_instances_match(tag_def_curated, tag_def1):
    value = "Same Value"
    tag_instance_destination = (
        TagInstanceHistory.objects.create(  # pylint: disable=no-member
            id_persistent=c.id_tag_instance_match_destination,
            id_entity_persistent=ce.id_persistent_test_1,
            id_tag_definition_persistent=tag_def_curated.id_persistent,
            time_edit=c.time_edit_tag_instance_match_destination,
            value=value,
        )
    )
    tag_instance_origin = (
        TagInstanceHistory.objects.create(  # pylint: disable=no-member
            id_persistent=c.id_tag_instance_match_origin,
            id_entity_persistent=c.id_persistent_entity_duplicate_test,
            id_tag_definition_persistent=tag_def1.id_persistent,
            time_edit=c.time_edit_tag_instance_match_origin,
            value=value,
        )
    )
    return [tag_instance_origin, tag_instance_destination]


@pytest.fixture
def tag_merge_request(tag_def_curated, tag_def1, contribution_candidate):
    return TagMergeRequest.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_tag_merge_request_persistent,
        id_origin_persistent=tag_def1.id_persistent,
        id_destination_persistent=tag_def_curated.id_persistent,
        contribution_candidate=contribution_candidate,
        state=TagMergeRequest.OPEN,
        created_by=tag_def1.owner,
        created_at=c.time_edit_tag_merge_request,
    )
