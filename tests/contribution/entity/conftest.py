# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import pytest

import tests.contribution.entity.common as c
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity


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
        anonymous=True,
        has_header=True,
        created_by=user,
        file_name="unknown.csv",
        state=ContributionCandidate.VALUES_EXTRACTED,
    )
