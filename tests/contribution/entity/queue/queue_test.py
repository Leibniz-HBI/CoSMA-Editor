# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, patch

import pytest

import tests.contribution.entity.common as c
import tests.entity.common as ce
import tests.value.common as cv
import cosmae.contribution.entity.queue as q
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity, EntityHistory, EntityJustification
from cosmae.value.models_django import (
    Value,
    ValueHistory,
    value_objects,
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
    entity_duplicate, contribution_candidate
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


@pytest.mark.django_db
def test_replaces_entity_of_column(values_for_replace, user, entity_match):
    q.update_values(
        q.annotate_with_replacement_info(
            Value.objects,  # pylint: disable=no-member
            EntityDuplicate.objects.all(),  # pylint: disable=no-member
            "id_entity_persistent",
        ),
        user,
        c.time_edit_deduplication,
    )
    instances = Value.objects.all()  # pylint: disable=no-member

    assert len(instances) == 2
    for inst in instances:
        assert inst.id_entity_persistent == ce.id_persistent_test_1


@pytest.mark.django_db
def test_keeps_entity_of_column(user, values_for_replace):
    q.update_values(
        q.annotate_with_replacement_info(
            Value.objects,  # pylint: disable=no-member
            EntityDuplicate.objects.all(),  # pylint: disable=no-member
            "id_entity_persistent",
        ),
        user,
        c.time_edit_deduplication,
    )
    instances = Value.objects.all()  # pylint: disable=no-member

    assert len(instances) == 2
    for inst in instances:
        assert inst.id_entity_persistent == c.id_persistent_entity_duplicate_test


def test_eliminate_duplicates(contribution_candidate, values, entity_match):
    assert 5 == len(ValueHistory.objects.all())  # pylint: disable=no-member
    q.eliminate_duplicates(contribution_candidate.id_persistent)
    assert 3 == len(
        Entity.objects.primary_only()
        .exclude_contributed()
        .chunk(
            0,
            5,
        )
    )
    assert 0 == len(
        Entity.objects.primary_only()
        .exclude(contribution_candidate=None)
        .chunk(
            0,
            5,
        )
    )
    # There have been two edits
    assert 7 == len(ValueHistory.objects.all())  # pylint: disable=no-member
    for_column = [
        column.__dict__
        for column in value_objects().by_column_chunked_queryset(
            c.id_column_test, 0, 20
        )
    ]
    assert for_column[0]["previous_version_id"] is None
    assert for_column[1]["previous_version_id"] is not None
    for column in for_column:
        column.pop("_state")
        column.pop("time_edit")
        column.pop("previous_version_id")
        column.pop("id")
    assert for_column == [
        {
            "id_persistent": cv.id_instance_test1,
            "id_column_persistent": c.id_column_test,
            "id_entity_persistent": ce.id_persistent_test_0,
            "value": "1.7",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
        {
            "id_persistent": cv.id_instance_test0,
            "id_entity_persistent": ce.id_persistent_test_1,
            "id_column_persistent": c.id_column_test,
            "value": "2.4",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
    ]
    for_column = [
        column.__dict__
        for column in value_objects().by_column_chunked_queryset(
            c.id_column_test1, 0, 20
        )
    ]
    assert for_column[0]["previous_version_id"] is None
    assert for_column[1]["previous_version_id"] is not None
    for column in for_column:
        column.pop("_state")
        column.pop("time_edit")
        column.pop("previous_version_id")
        column.pop("id")
    assert for_column == [
        {
            "id_persistent": cv.id_instance_test3,
            "id_column_persistent": c.id_column_test1,
            "id_entity_persistent": ce.id_persistent_test_1,
            "value": "baz",
            "hidden": False,
            "disabled": False,
            "written_by_session_id": contribution_candidate.created_by.edit_session.id_persistent,
            "approved_by": None,
            "merged_from": None,
        },
        {
            "id_persistent": cv.id_instance_test2,
            "id_entity_persistent": ce.id_persistent_test_1,
            "id_column_persistent": c.id_column_test1,
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
