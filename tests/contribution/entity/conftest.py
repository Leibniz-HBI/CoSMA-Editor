# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import pytest

import tests.contribution.entity.common as c
import tests.entity.common as ce
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import EntityHistory
from cosmae.justification.models_django import EntityJustification
from cosmae.merge_request.models_django import ColumnMergeRequest
from cosmae.value.models_django import ValueHistory


@pytest.fixture
def entity_duplicate(contribution_candidate):
    entity_duplicate, _ = EntityHistory.change_or_create_versioned(
        id_persistent=c.id_persistent_entity_duplicate_test,
        display_txt=c.display_txt_test_entity_duplicate,
        time_edit=c.time_edit_test_duplicate,
        contribution_candidate=contribution_candidate,
        written_by_session=contribution_candidate.created_by.edit_session,
        approved_by=contribution_candidate.created_by.id_persistent,
    )
    entity_duplicate.save()
    return entity_duplicate


@pytest.fixture
def entity_duplicate1(contribution_candidate):
    entity_duplicate, _ = EntityHistory.change_or_create_versioned(
        id_persistent=c.id_persistent_entity_duplicate_test1,
        display_txt=c.display_txt_test_entity_duplicate1,
        time_edit=c.time_edit_test_duplicate1,
        contribution_candidate=contribution_candidate,
        written_by_session=contribution_candidate.created_by.edit_session,
        approved_by=contribution_candidate.created_by.id_persistent,
    )
    entity_duplicate.save()
    return entity_duplicate


@pytest.fixture
def entity_duplicate_no_match(contribution_candidate):
    entity_duplicate, _ = EntityHistory.change_or_create_versioned(
        id_persistent=c.id_persistent_entity_duplicate_no_match_test,
        display_txt=c.display_txt_test_entity_duplicate_no_match,
        time_edit=c.time_edit_test_duplicate_no_match,
        written_by_session=contribution_candidate.created_by.edit_session,
        approved_by=contribution_candidate.created_by.id_persistent,
    )
    entity_duplicate.save()
    return entity_duplicate


@pytest.fixture
def entities(entity0, entity1, entity_duplicate, entity_duplicate_no_match):
    return [entity0, entity1, entity_duplicate, entity_duplicate_no_match]


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
def duplicate_assignment_discard(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        id_destination_persistent=None,
        contribution_candidate=contribution_candidate,
        discard=True,
    )


@pytest.fixture
def duplicate_assignment_no_match(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        id_destination_persistent=c.id_persistent_entity_duplicate_no_match_test,
        contribution_candidate=contribution_candidate,
    )


@pytest.fixture()
def values_match(column_curated, column1):
    value = "Same Value"
    value_destination = ValueHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_value_match_destination,
        id_entity_persistent=ce.id_persistent_test_1,
        id_column_persistent=column_curated.id_persistent,
        time_edit=c.time_edit_value_match_destination,
        value=value,
        written_by_session=column1.owner.edit_session,
        approved_by=column1.owner.id_persistent,
    )
    value_origin = ValueHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_value_match_origin,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_column_persistent=column1.id_persistent,
        time_edit=c.time_edit_value_match_origin,
        value=value,
        written_by_session=column1.owner.edit_session,
        approved_by=column1.owner.id_persistent,
    )
    return [value_origin, value_destination]


@pytest.fixture
def column_merge_request(column_curated, column1, contribution_candidate):
    return ColumnMergeRequest.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_merge_request_persistent,
        id_origin_persistent=column1.id_persistent,
        id_destination_persistent=column_curated.id_persistent,
        contribution_candidate=contribution_candidate,
        state=ColumnMergeRequest.State.OPEN,
        created_by=column1.owner,
        created_at=c.time_edit_column_merge_request,
    )


@pytest.fixture
def justification(entity_duplicate):
    return EntityJustification.objects.create(  # pylint: disable=no-member
        id_persistent=c.justification_id_persistent,
        id_entity_persistent=entity_duplicate.id_persistent,
        text=c.justification_text,
        timestamp=c.justification_timestamp,
        author_session=entity_duplicate.written_by_session,
    )
