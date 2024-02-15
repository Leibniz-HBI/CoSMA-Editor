# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-arguments

from django.db import models

from tests.merge_request.entity import common as c
from cosmae.entity.models_django import Entity
from cosmae.merge_request.entity.models_django import EntityMergeRequest
from cosmae.merge_request.entity.queue import apply_entity_merge_request
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstance


def test_creates_tag_merge_requests(conflict_resolution_replace):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    user = merge_request.created_by
    apply_entity_merge_request(merge_request.id_persistent, user.id_persistent)
    most_recent = Entity.most_recent().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    tag_merge_requests = TagMergeRequest.objects.all()  # pylint: disable=no-member
    assert len(tag_merge_requests) == 3
    assert len({mr.id_destination_persistent for mr in tag_merge_requests}) == 3
    for mr in tag_merge_requests:
        assert mr.disable_origin_on_merge
    tag_defs_including_hidden = TagDefinition.query_set(include_hidden=True)
    assert len(tag_defs_including_hidden) == 6
    assert len(TagDefinition.query_set()) == 3
    hidden_tag_def_instances = (
        TagInstance.objects.all()  # pylint: disable=no-member
        .annotate(
            hidden=models.Subquery(
                tag_defs_including_hidden.filter(
                    id_persistent=models.OuterRef("id_tag_definition_persistent")
                ).values("hidden")
            )
        )
        .filter(hidden=True)
    )
    assert len(hidden_tag_def_instances) == 3


def test_creates_tag_merge_requests_empty_destination(
    conflict_resolution_replace_empty_destination,
):
    merge_request = conflict_resolution_replace_empty_destination.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    user = merge_request.created_by
    apply_entity_merge_request(merge_request.id_persistent, user.id_persistent)
    most_recent = Entity.most_recent().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    tag_merge_requests = TagMergeRequest.objects.all()  # pylint: disable=no-member
    assert len(tag_merge_requests) == 3
    assert len({mr.id_destination_persistent for mr in tag_merge_requests}) == 3
    for mr in tag_merge_requests:
        assert mr.disable_origin_on_merge
    tag_defs_including_hidden = TagDefinition.query_set(include_hidden=True)
    assert len(tag_defs_including_hidden) == 6
    assert len(TagDefinition.query_set()) == 3
    hidden_tag_def_instances = (
        TagInstance.objects.all()  # pylint: disable=no-member
        .annotate(
            hidden=models.Subquery(
                tag_defs_including_hidden.filter(
                    id_persistent=models.OuterRef("id_tag_definition_persistent")
                ).values("hidden")
            )
        )
        .filter(hidden=True)
    )
    assert len(hidden_tag_def_instances) == 3


def test_applies_resolutions(conflict_resolution_replace, user1):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.most_recent().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    tag_merge_requests = TagMergeRequest.objects.all()  # pylint: disable=no-member
    assert len(tag_merge_requests) == 2
    assert len({mr.id_destination_persistent for mr in tag_merge_requests}) == 2
    assert len(TagDefinition.query_set(include_hidden=True)) == 5
    assert len(TagDefinition.query_set()) == 3


def test_creates_tag_merge_request_for_updated(
    conflict_resolution_replace,
    user1,
    instance_merge_request_destination_user_conflict_changed,
):
    merge_request = conflict_resolution_replace.merge_request
    merge_request.state = EntityMergeRequest.RESOLVED
    merge_request.save()
    apply_entity_merge_request(merge_request.id_persistent, user1.id_persistent)
    most_recent = Entity.most_recent().get()
    assert most_recent.display_txt == c.display_txt_entity_destination
    tag_merge_requests = TagMergeRequest.objects.all()  # pylint: disable=no-member
    assert len(tag_merge_requests) == 3
    assert len({mr.id_destination_persistent for mr in tag_merge_requests}) == 3
    tag_defs_including_hidden = TagDefinition.query_set(include_hidden=True)
    assert len(tag_defs_including_hidden) == 6
    assert len(TagDefinition.query_set()) == 3
    hidden_tag_def_instances = (
        TagInstance.objects.all()  # pylint: disable=no-member
        .annotate(
            hidden=models.Subquery(
                tag_defs_including_hidden.filter(
                    id_persistent=models.OuterRef("id_tag_definition_persistent")
                ).values("hidden")
            )
        )
        .filter(hidden=True)
    )
    assert len(hidden_tag_def_instances) == 3
