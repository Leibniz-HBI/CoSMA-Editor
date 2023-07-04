# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
import pytest

import tests.contribution.entity.common as c
import tests.entity.common as ce
import tests.tag.common as ct
import cosmae.contribution.entity.queue as q
from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.entity.models_django import Entity
from cosmae.tag.models_django import TagDefinition, TagInstance


@pytest.fixture()
def entity_match(contribution_candidate):
    return EntityDuplicate.objects.create(  # pylint: disable=no-member
        id_destination_persistent=ce.id_persistent_test_1,
        id_origin_persistent=c.id_persistent_entity_duplicate_test,
        contribution_candidate=contribution_candidate,
    )


@pytest.mark.django_db
def test_annotate_duplicates(entities, entity_match):
    with_replacement_info = q.annotate_with_replacement_info(
        Entity.objects.all(),  # pylint: disable=no-member
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
    assert list(no_replace_ids) == [ce.id_persistent_test_0, ce.id_persistent_test_1]


@pytest.mark.django_db
def test_deletes_replaced(entity_duplicate, entity_match):
    assert len(Entity.objects.all()) == 1  # pylint: disable = no-member
    with_replacement_info = q.annotate_with_replacement_info(
        Entity.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    q.update_entities(with_replacement_info)
    assert len(Entity.objects.all()) == 0  # pylint: disable = no-member


@pytest.mark.django_db
def test_removes_contribution_candidate_from_others(entity_duplicate):
    with_replacement_info = q.annotate_with_replacement_info(
        Entity.objects.all(),  # pylint: disable=no-member
        EntityDuplicate.objects.all(),  # pylint: disable=no-member
        "id_persistent",
    )
    q.update_entities(with_replacement_info)
    entity = Entity.objects.all().get()  # pylint: disable = no-member
    assert entity.contribution_candidate is None


@pytest.fixture
def tag_def():
    TagDefinition.objects.create(  # pylint: disable = no-member
        id_persistent=c.id_tag_def_test,
        name=c.name_tag_def_test,
        type=TagDefinition.STRING,
        time_edit=c.time_edit_tag_def_test,
    )


@pytest.fixture
def tag_def1():
    TagDefinition.objects.create(  # pylint: disable = no-member
        id_persistent=c.id_tag_def_test1,
        id_parent_persistent=c.id_tag_def_test,
        name=c.name_tag_def_test1,
        type=TagDefinition.STRING,
        time_edit=c.time_edit_tag_def_test1,
    )


@pytest.fixture
def tag_instances_for_replace(tag_def, tag_def1, entities):
    inst0 = TagInstance.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_replace_test,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
    )
    inst0 = TagInstance.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_replace_test,
        value="b",
        previous_version=inst0,
        time_edit=c.time_edit_tag_instance_test,
    )
    _inst1 = TagInstance.objects.create(  # pylint: disable = no-member
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_replace_test1,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
    )


@pytest.fixture
def tag_instance_existing(tag_def, tag_def1, entities):
    inst0 = TagInstance.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_existing_test,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
    )
    inst0 = TagInstance.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_0,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_persistent=c.id_instance_existing_test,
        value="b",
        previous_version=inst0,
        time_edit=c.time_edit_tag_instance_test,
    )
    _inst1 = TagInstance.objects.create(  # pylint: disable = no-member
        id_entity_persistent=ce.id_persistent_test_1,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_persistent=c.id_instance_existing_test1,
        value="a",
        time_edit=c.time_edit_tag_instance_test,
    )


@pytest.mark.django_db
def test_replaces_entity_of_tag_def(tag_instances_for_replace, entity_match):
    q.update_tag_instances(
        q.annotate_with_replacement_info(
            TagInstance.most_recent_queryset(
                TagInstance.objects  # pylint: disable=no-member
            ),
            EntityDuplicate.objects.all(),  # pylint: disable=no-member
            "id_entity_persistent",
        ),
        c.time_edit_deduplication,
    )
    instances = TagInstance.most_recent_queryset(
        TagInstance.objects.all()  # pylint: disable=no-member
    )

    assert len(instances) == 2
    for inst in instances:
        assert inst.id_entity_persistent == ce.id_persistent_test_1


@pytest.mark.django_db
def test_keeps_entity_of_tag_def(tag_instances_for_replace):
    q.update_tag_instances(
        q.annotate_with_replacement_info(
            TagInstance.most_recent_queryset(
                TagInstance.objects  # pylint: disable=no-member
            ),
            EntityDuplicate.objects.all(),  # pylint: disable=no-member
            "id_entity_persistent",
        ),
        c.time_edit_deduplication,
    )
    instances = TagInstance.most_recent_queryset(
        TagInstance.objects.all()  # pylint: disable=no-member
    )

    assert len(instances) == 2
    for inst in instances:
        assert inst.id_entity_persistent == c.id_persistent_entity_duplicate_test


@pytest.fixture
def tag_instances(tag_def, tag_def1, entities):
    tag_inst0, _ = TagInstance.change_or_create(
        id_persistent=ct.id_instance_test0,
        time_edit=ce.time_edit_test_0,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        value="2.4",
    )
    tag_inst0.save()
    tag_inst1, _ = TagInstance.change_or_create(
        id_persistent=ct.id_instance_test1,
        id_tag_definition_persistent=c.id_tag_def_test,
        id_entity_persistent=ce.id_persistent_test_0,
        time_edit=ce.time_edit_test_0,
        value="1.7",
    )
    tag_inst1.save()
    tag_inst2, _ = TagInstance.change_or_create(
        id_persistent=ct.id_instance_test2,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        time_edit=ce.time_edit_test_0,
        value="foo",
    )
    tag_inst2.save()
    tag_inst2, _ = TagInstance.change_or_create(
        id_persistent=ct.id_instance_test2,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_entity_persistent=c.id_persistent_entity_duplicate_test,
        time_edit=ce.time_edit_test_0,
        value="bar",
        version=tag_inst2.id,
    )
    tag_inst2.save()
    tag_inst3, _ = TagInstance.change_or_create(
        id_persistent=ct.id_instance_test3,
        id_tag_definition_persistent=c.id_tag_def_test1,
        id_entity_persistent=ce.id_persistent_test_1,
        time_edit=ce.time_edit_test_0,
        value="baz",
    )
    tag_inst3.save()
    return [tag_inst0, tag_inst1, tag_inst2, tag_inst3]


def test_eliminate_duplicates(contribution_candidate, tag_instances, entity_match):
    assert 5 == len(TagInstance.objects.all())  # pylint: disable=no-member
    q.eliminate_duplicates(contribution_candidate.id_persistent)
    assert 2 == len(
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
    assert 7 == len(TagInstance.objects.all())  # pylint: disable=no-member
    for_tag = [
        tag.__dict__ for tag in TagInstance.by_tag_chunked(c.id_tag_def_test, 0, 20)
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
        },
        {
            "id_persistent": ct.id_instance_test0,
            "id_entity_persistent": ce.id_persistent_test_1,
            "id_tag_definition_persistent": c.id_tag_def_test,
            "value": "2.4",
        },
    ]
    for_tag = [
        tag.__dict__ for tag in TagInstance.by_tag_chunked(c.id_tag_def_test1, 0, 20)
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
        },
        {
            "id_persistent": ct.id_instance_test2,
            "id_entity_persistent": ce.id_persistent_test_1,
            "id_tag_definition_persistent": c.id_tag_def_test1,
            "value": "bar",
        },
    ]
