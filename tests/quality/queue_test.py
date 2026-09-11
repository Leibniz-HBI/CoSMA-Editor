# pylint: disable=unused-argument,redefined-outer-name, invalid-name
"Tests for quality queue methods"

from datetime import datetime

from pytest import fixture

import tests.column.common as cc
import tests.entity.common as ce
import tests.value.common as cv
from cosmae.merge_request.entity.models_django import EntityMergeRequest
from cosmae.quality.queue import find_duplicates_in_column
from cosmae.value.models_django import ValueHistory

id_entity_duplicate = "7154ef87-e28d-42b6-8a03-0e828b0c72a6"
id_instance_duplicate = "c461f557-9b08-4e43-93a3-66787de1b588"


@fixture
def value_duplicate(user):
    """Create a value that is a duplicate of an existing value in a curated column
    but for a different entity"""
    value = ValueHistory(
        id_persistent=id_instance_duplicate,
        time_edit=cv.time_edit_instance_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=cc.id_column_curated_test,
        id_entity_persistent=id_entity_duplicate,
        value="value",
    )
    value.save()


def test_creates_merge_request(values_curated, value_duplicate):
    "Make sure an entity merge request is created when duplicates are found in a curated column"
    find_duplicates_in_column(cc.id_column_curated_test)

    merge_request = EntityMergeRequest.objects.all().get()
    assert merge_request.state == EntityMergeRequest.State.CONFLICTS
    assert merge_request.id_origin_persistent == ce.id_persistent_test_0
    assert merge_request.id_destination_persistent == id_entity_duplicate


def test_does_not_create_duplicate_merge_request(values_curated, value_duplicate):
    "Make sure no duplicate entity merge request is created when it already exists"
    id_persistent = "d9f78a21-b538-466a-ad7b-98639ee6e675"
    EntityMergeRequest.objects.create(
        state=EntityMergeRequest.State.CONFLICTS,
        id_origin_persistent=ce.id_persistent_test_0,
        id_destination_persistent=id_entity_duplicate,
        created_at=datetime(2022, 1, 1),
        id_persistent=id_persistent,
    )
    find_duplicates_in_column(cc.id_column_curated_test)

    merge_request = EntityMergeRequest.objects.get()
    assert str(merge_request.id_persistent) == id_persistent


def test_does_not_create_duplicate_merge_request_reversed(
    values_curated, value_duplicate
):
    """Make sure no duplicate entity merge request is created when it already exists
    but with reversed origin and destination"""
    id_persistent = "d9f78a21-b538-466a-ad7b-98639ee6e675"
    EntityMergeRequest.objects.create(
        state=EntityMergeRequest.State.CONFLICTS,
        id_origin_persistent=id_entity_duplicate,
        id_destination_persistent=ce.id_persistent_test_0,
        created_at=datetime(2022, 1, 1),
        id_persistent=id_persistent,
    )
    find_duplicates_in_column(cc.id_column_curated_test)

    merge_request = EntityMergeRequest.objects.get()
    assert str(merge_request.id_persistent) == id_persistent
