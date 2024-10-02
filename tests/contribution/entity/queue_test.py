# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, patch

import pytest

import tests.contribution.entity.common as c
import tests.entity.common as ce
import tests.tag.common as ct
import cosmae.contribution.entity.queue as q
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity, EntityHistory, EntityJustification
from cosmae.tag.models_django import (
    TagDefinition,
    TagDefinitionHistory,
    TagInstance,
    TagInstanceHistory,
)


@pytest.fixture()
def entity_match(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_destination_persistent=ce.id_persistent_test_1,
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        contribution_candidate=contribution_candidate,
    )


@pytest.fixture()
def contribution_with_justification(user):

    return ContributionCandidate.objects.create(  # pylint: disable=no-member
        state=ContributionCandidate.ENTITIES_ASSIGNED,
        name="contribution with justification",
        id_persistent="1b75363f-bf94-432f-96af-2293aa53ab8b",
        has_header=True,
        created_by=user,
        justification="justification",
    )


@pytest.mark.django_db
def test_annotate_duplicates(entities, entity_match):
    with_replacement_info = q.annotate_with_replacement_info(
        EntityHistory.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    to_replace = with_replacement_info.filter(
        replacement_id_entity_persistent__isnull=False
    ).get()
    assert to_replace.display_txt == c.display_txt_test_entity_duplicate
    assert to_replace.replacement_id_entity_persistent == ce.id_persistent_test_1
    no_replace_ids = with_replacement_info.filter(
        replacement_id_entity_persistent__isnull=True
    ).values_list("id_persistent", flat=True)
    assert list(no_replace_ids) == [
        ce.id_persistent_test_0,
        ce.id_persistent_test_1,
        c.id_persistent_entity_duplicate_no_match_test,
    ]


@pytest.mark.django_db
def test_deletes_replaced(
    entity_duplicate, entity_match, contribution_with_justification
):
    assert len(EntityHistory.objects.all()) == 1  # pylint: disable = no-member
    with_replacement_info = q.annotate_with_replacement_info(
        EntityHistory.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    q.update_entities(
        with_replacement_info,
        contribution_with_justification,
        c.time_edit_deduplication,
    )
    assert len(EntityHistory.objects.all()) == 0  # pylint: disable = no-member


@pytest.mark.django_db
def test_copies_justifications(
    entity_duplicate, entity_match, contribution_with_justification
):
    time = c.time_edit_deduplication
    EntityJustification.add(
        "60c667cf-166d-466d-b106-825f9a7ec91d",
        entity_match.id_origin_persistent,
        "justification",
        time,
        contribution_with_justification.created_by,
    )
    EntityJustification.add(
        "b8eb133c-4a52-4ddf-bdef-b1df05cfcb4f",
        entity_match.id_origin_persistent,
        "another justification",
        time,
        contribution_with_justification.created_by,
    )
    assert len(EntityHistory.objects.all()) == 1  # pylint: disable = no-member
    with_replacement_info = q.annotate_with_replacement_info(
        EntityHistory.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    q.update_entities(
        with_replacement_info,
        contribution_with_justification,
        c.time_edit_deduplication,
    )
    assert len(EntityHistory.objects.all()) == 0  # pylint: disable = no-member
    assert (
        len(
            EntityJustification.for_id_entity_persistent_unordered(
                entity_match.id_destination_persistent
            )
        )
        == 2
    )


@pytest.mark.django_db
def test_removes_contribution_candidate_from_others(
    entity_duplicate, contribution_with_justification
):
    with_replacement_info = q.annotate_with_replacement_info(
        EntityHistory.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    q.update_entities(
        with_replacement_info,
        contribution_with_justification,
        c.time_edit_deduplication,
    )
    entity = EntityHistory.objects.all().get()  # pylint: disable = no-member
    assert entity.contribution_candidate is None
    assert (
        EntityJustification.objects.filter(id_entity_persistent=entity.id_persistent)
        .get()
        .text
        == contribution_with_justification.justification
    )


@pytest.mark.django_db
def test_exception_for_entity_update_without_justification(
    entity_duplicate, entity_match, contribution_candidate
):
    assert len(EntityHistory.objects.all()) == 1  # pylint: disable = no-member
    with_replacement_info = q.annotate_with_replacement_info(
        EntityHistory.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    with pytest.raises(q.MissingJustificationException):
        q.update_entities(
            with_replacement_info,
            contribution_candidate,
            c.time_edit_deduplication,
        )


@pytest.fixture
def tag_def(user):
    return TagDefinitionHistory.objects.create(  # pylint: disable = no-member
        id_persistent=c.id_tag_def_test,
        name=c.name_tag_def_test,
        type=TagDefinition.STRING,
        time_edit=c.time_edit_tag_def_test,
        owner=user,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def tag_def1(user):
    return TagDefinitionHistory.objects.create(  # pylint: disable = no-member
        id_persistent=c.id_tag_def_test1,
        id_parent_persistent=c.id_tag_def_test,
        name=c.name_tag_def_test1,
        type=TagDefinition.STRING,
        time_edit=c.time_edit_tag_def_test1,
        owner=user,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def tag_instances_for_replace(tag_def, tag_def1, entities):
    inst0 = TagInstanceHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_replace_test,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
        written_by_session=tag_def.owner.edit_session,
        approved_by=tag_def.owner.id_persistent,
    )
    inst0 = TagInstanceHistory.objects.create(  # pylint: disable=no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_replace_test,
        value="b",
        previous_version=inst0,
        time_edit=c.time_edit_tag_instance_test,
        written_by_session=tag_def.owner.edit_session,
        approved_by=tag_def.owner.id_persistent,
    )
    _inst1 = TagInstanceHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_replace_test1,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
        written_by_session=tag_def.owner.edit_session,
        approved_by=tag_def.owner.id_persistent,
    )


@pytest.fixture
def tag_instance_existing(tag_def, tag_def1, entities):
    inst0 = TagInstanceHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_existing_test,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
        written_by_session=tag_def.owner.edit_session,
        approved_by=tag_def.owner.id_persistent,
    )
    inst0 = TagInstanceHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_existing_test,
        value="b",
        previous_version=inst0,
        time_edit=c.time_edit_tag_instance_test,
        written_by_session=tag_def.owner.edit_session,
        approved_by=tag_def.owner.id_persistent,
    )
    _inst1 = TagInstanceHistory.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_persistent=c.id_instance_existing_test1,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
        written_by_session=tag_def1.owner.edit_session,
        approved_by=tag_def1.owner.id_persistent,
    )


@pytest.mark.django_db
def test_replaces_entity_of_tag_def(tag_instances_for_replace, user, entity_match):
    q.update_tag_instances(
        q.annotate_with_replacement_info(
            TagInstance.objects,  # pylint: disable=no-member
            EntityDuplicate.objects.all(),  # pylint: disable=no-member
            "id_entity_persistent",
        ),
        user,
        c.time_edit_deduplication,
    )
    instances = TagInstance.objects.all()  # pylint: disable=no-member

    assert len(instances) == 2
    for inst in instances:
        assert inst.id_entity_persistent == ce.id_persistent_test_1


@pytest.mark.django_db
def test_keeps_entity_of_tag_def(user, tag_instances_for_replace):
    q.update_tag_instances(
        q.annotate_with_replacement_info(
            TagInstance.objects,  # pylint: disable=no-member
            EntityDuplicate.objects.all(),  # pylint: disable=no-member
            "id_entity_persistent",
        ),
        user,
        c.time_edit_deduplication,
    )
    instances = TagInstance.objects.all()  # pylint: disable=no-member

    assert len(instances) == 2
    for inst in instances:
        assert inst.id_entity_persistent == c.id_persistent_entity_duplicate_test


@pytest.fixture
def tag_instances(tag_def, tag_def1, entities):
    tag_inst0, _ = TagInstanceHistory.change_or_create_versioned(
        id_persistent=ct.id_instance_test0,
        time_edit=ce.time_edit_test_0,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        written_by_session=tag_def.owner.edit_session,
        value="2.4",
    )
    tag_inst0.save()
    tag_inst1, _ = TagInstanceHistory.change_or_create_versioned(
        id_persistent=ct.id_instance_test1,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_entity_persistent=ce.id_persistent_test_0,
        time_edit=ce.time_edit_test_0,
        written_by_session=tag_def.owner.edit_session,
        value="1.7",
    )
    tag_inst1.save()
    tag_inst2, _ = TagInstanceHistory.change_or_create_versioned(
        id_persistent=ct.id_instance_test2,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        time_edit=ce.time_edit_test_0,
        written_by_session=tag_def1.owner.edit_session,
        value="foo",
    )
    tag_inst2.save()
    tag_inst2, _ = TagInstanceHistory.change_or_create_versioned(
        id_persistent=ct.id_instance_test2,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        time_edit=ce.time_edit_test_0,
        written_by_session=tag_def1.owner.edit_session,
        value="bar",
        version=tag_inst2.id,
    )
    tag_inst2.save()
    tag_inst3, _ = TagInstanceHistory.change_or_create_versioned(
        id_persistent=ct.id_instance_test3,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_entity_persistent=ce.id_persistent_test_1,
        time_edit=ce.time_edit_test_0,
        written_by_session=tag_def1.owner.edit_session,
        value="baz",
    )
    tag_inst3.save()
    return [tag_inst0, tag_inst1, tag_inst2, tag_inst3]


def test_eliminate_duplicates(contribution_candidate, tag_instances, entity_match):
    assert 5 == len(TagInstanceHistory.objects.all())  # pylint: disable=no-member
    q.eliminate_duplicates(contribution_candidate.id_persistent)
    assert 3 == len(
        Entity.get_most_recent_chunked(
            0,
            5,
            Entity.objects.filter(  # pylint: disable=no-member
                contribution_candidate=None
            ),
        )
    )
    assert 0 == len(
        Entity.get_most_recent_chunked(
            0,
            5,
            Entity.objects.exclude(  # pylint: disable=no-member
                contribution_candidate=None
            ),
        )
    )
    # There have been two edits
    assert 7 == len(TagInstanceHistory.objects.all())  # pylint: disable=no-member
    for_tag = [
        tag.__dict__
        for tag in TagInstance.by_tag_chunked_queryset(c.id_tag_def_test, 0, 20)
    ]
    assert for_tag[0]["previous_version_id"] is None
    assert for_tag[1]["previous_version_id"] is not None
    for tag in for_tag:
        tag.pop("_state")
        tag.pop("time_edit")
        tag.pop("previous_version_id")
        tag.pop("id")
    assert for_tag == [
        {
            "id_persistent": ct.id_instance_test1,
            "id_tag_definition_persistent": c.id_tag_def_test,
            "id_entity_persistent": ce.id_persistent_test_0,
            "value": "1.7",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
        {
            "id_persistent": ct.id_instance_test0,
            "id_entity_persistent": ce.id_persistent_test_1,
            "id_tag_definition_persistent": c.id_tag_def_test,
            "value": "2.4",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
    ]
    for_tag = [
        tag.__dict__
        for tag in TagInstance.by_tag_chunked_queryset(c.id_tag_def_test1, 0, 20)
    ]
    assert for_tag[0]["previous_version_id"] is None
    assert for_tag[1]["previous_version_id"] is not None
    for tag in for_tag:
        tag.pop("_state")
        tag.pop("time_edit")
        tag.pop("previous_version_id")
        tag.pop("id")
    assert for_tag == [
        {
            "id_persistent": ct.id_instance_test3,
            "id_tag_definition_persistent": c.id_tag_def_test1,
            "id_entity_persistent": ce.id_persistent_test_1,
            "value": "baz",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
        {
            "id_persistent": ct.id_instance_test2,
            "id_entity_persistent": ce.id_persistent_test_1,
            "id_tag_definition_persistent": c.id_tag_def_test1,
            "value": "bar",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
    ]


def test_sets_error(contribution_candidate):
    mock = MagicMock()
    mock.side_effect = Exception("error")
    with patch("cosmae.contribution.entity.queue.timestamp", mock):
        q.eliminate_duplicates(contribution_candidate.id_persistent)
    contribution_candidate = ContributionCandidate.by_id_persistent(
        contribution_candidate.id_persistent, contribution_candidate.created_by
    ).get()
    assert contribution_candidate.state == ContributionCandidate.VALUES_EXTRACTED
    assert (
        contribution_candidate.error_msg == "Error during Entity Duplicate Elimination."
    )
    assert contribution_candidate.error_trace == "Exception: error"
