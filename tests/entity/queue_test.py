# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

import tests.tag.common as ct
import tests.user.common as cu
from tests.utils import assert_versioned
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity
from cosmae.entity.queue import (
    entity_display_txt_information_cache,
    tag_def_db_to_dict,
    update_display_txt_cache,
)
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagInstanceHistory

id_persistent_entity_no_display_txt = "7d5c19e6-f47d-4c4f-a92f-0c858c18885f"
time_edit_entity_no_display_txt = datetime(2002, 3, 7, tzinfo=timezone.utc)
time_edit_entity_contribution_no_display_txt = datetime(2002, 4, 7, tzinfo=timezone.utc)
id_persistent_instance_tag_def_1 = "4603a4ed-b1b2-4a25-9556-dd82011e3d06"
time_edit_instance_tag_def_1 = datetime(2002, 5, 6, tzinfo=timezone.utc)
value_instance_tag_def_1 = "Some value used as display txt"
id_contribution_persistent = "2c206f03-8926-4b22-85ff-56131da543f8"
id_tag_merge_request_persistent = "c412772a-b894-495a-9fe9-fd4b5c31894f"
time_tag_def_created_at = datetime(2002, 5, 8, tzinfo=timezone.utc)


@pytest.mark.django_db
def test_with_display_txt(entity0):
    update_display_txt_cache(entity0.id_persistent)
    result = entity_display_txt_information_cache.get(entity0.id_persistent)
    assert result == (entity0.display_txt, "Display Text")


@pytest.fixture
def entity_without_display_txt(db, user):
    entity, _ = Entity.change_or_create_versioned(
        id_persistent=id_persistent_entity_no_display_txt,
        time_edit=time_edit_entity_no_display_txt,
        written_by_id_persistent=user.id_persistent,
    )
    entity.save()
    return entity


def test_without_display_txt_and_no_tag_def_order(entity_without_display_txt):
    entity_display_txt_information_cache.delete(
        entity_without_display_txt.id_persistent
    )
    update_display_txt_cache(entity_without_display_txt.id_persistent)
    result = entity_display_txt_information_cache.get(
        entity_without_display_txt.id_persistent
    )
    assert result is None


@pytest.fixture
def instance_tag_def_1(entity_without_display_txt, tag_def1):
    instance, _ = TagInstanceHistory.change_or_create_versioned(
        id_persistent=id_persistent_instance_tag_def_1,
        time_edit=time_edit_instance_tag_def_1,
        id_entity_persistent=entity_without_display_txt.id_persistent,
        id_tag_definition_persistent=tag_def1.id_persistent,
        value=value_instance_tag_def_1,
        written_by_id_persistent=tag_def1.owner.id_persistent,
    )
    instance.save()
    return instance


def test_without_display_txt_but_relevant_tag_instance(
    user1, display_txt_order_0_1_curated, instance_tag_def_1
):
    update_display_txt_cache(instance_tag_def_1.id_entity_persistent)
    result = entity_display_txt_information_cache.get(
        instance_tag_def_1.id_entity_persistent
    )
    assert result[0] == value_instance_tag_def_1
    tag_def = result[1]
    assert_versioned(
        tag_def,
        {
            "id_persistent": ct.id_tag_def_persistent_test_user1,
            "id_parent_persistent": None,
            "name": ct.name_tag_def_test1,
            "type": "STR",
            "owner": {
                "username": "test-user1",
                "permission_group": "APPLICANT",
                "id_persistent": user1.id_persistent,
            },
            "curated": False,
            "hidden": False,
            "disabled": False,
        },
        version_key="id",
    )


def test_without_display_txt_and_no_relevant_tag_instance(
    display_txt_order_0, instance_tag_def_1
):
    entity_display_txt_information_cache.delete(instance_tag_def_1.id_entity_persistent)
    update_display_txt_cache(instance_tag_def_1.id_entity_persistent)
    result = entity_display_txt_information_cache.get(
        instance_tag_def_1.id_entity_persistent
    )
    assert result is None


def test_exception(entity_without_display_txt):
    mock = MagicMock()
    mock.side_effect = Exception()
    entity_display_txt_information_cache.delete(
        entity_without_display_txt.id_persistent
    )
    with patch("cosmae.entity.queue.get_display_txt_order_tag_definitions", mock):
        update_display_txt_cache(entity_without_display_txt.id_persistent)
    result = entity_display_txt_information_cache.get(
        entity_without_display_txt.id_persistent
    )
    assert result is None


@pytest.fixture
def contribution_instance_without_display_txt(
    entity_without_display_txt, tag_def, tag_def1, user, instance_tag_def_1
):
    (
        contribution,
        _,
    ) = ContributionCandidate.objects.get_or_create(  # pylint: disable=no-member
        id_persistent=id_contribution_persistent,
        name="a test contribution",
        description="This is a contribution used in tests",
        has_header=True,
        created_by=user,
        file_name="file.csv",
        state=ContributionCandidate.VALUES_EXTRACTED,
    )
    entity, _ = Entity.change_or_create_versioned(
        entity_without_display_txt.id_persistent,
        time_edit=time_edit_entity_contribution_no_display_txt,
        version=entity_without_display_txt.id,
        contribution_candidate_id=contribution.id_persistent,
        written_by_id_persistent=user.id_persistent,
    )
    entity.save()
    TagMergeRequest.objects.create(  # pylint: disable=no-member
        id_persistent=id_tag_merge_request_persistent,
        assigned_to=None,
        contribution_candidate=contribution,
        id_origin_persistent=tag_def1.id_persistent,
        id_destination_persistent=tag_def.id_persistent,
        created_at=time_tag_def_created_at,
        created_by=user,
    )
    return instance_tag_def_1


def test_contribution(contribution_instance_without_display_txt, display_txt_order_0):
    update_display_txt_cache(
        contribution_instance_without_display_txt.id_entity_persistent
    )
    result = entity_display_txt_information_cache.get(
        contribution_instance_without_display_txt.id_entity_persistent
    )
    assert result[0] == value_instance_tag_def_1
    tag_def = result[1]
    assert_versioned(
        tag_def,
        {
            "id_persistent": ct.id_tag_def_persistent_test_user1,
            "id_parent_persistent": None,
            "name": ct.name_tag_def_test1,
            "type": "STR",
            "owner": {
                "username": "test-user1",
                "id_persistent": cu.test_uuid1,
                "permission_group": "APPLICANT",
            },
            "curated": False,
            "hidden": False,
            "disabled": False,
        },
        version_key="id",
    )


def test_db_to_dict(tag_def):
    tag_def.disabled = True
    tag_def_dict = tag_def_db_to_dict(tag_def)
    assert_versioned(
        tag_def_dict,
        {
            "id_persistent": ct.id_tag_def_persistent_test,
            "id_parent_persistent": None,
            "name": ct.name_tag_def_test,
            "type": "STR",
            "owner": {
                "username": "test-user",
                "id_persistent": tag_def.owner.id_persistent,
                "permission_group": "CONTRIBUTOR",
            },
            "curated": False,
            "hidden": False,
            "disabled": True,
        },
        version_key="id",
    )
