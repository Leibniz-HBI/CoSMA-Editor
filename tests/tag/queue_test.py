# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, call, patch

import pytest

import cosmae.tag.queue as q


def test_get_name_from_cache(tag_def):
    path = ["name", "path", "test"]
    q.tag_definition_name_path_cache.set(tag_def.id_persistent, path)
    result = q.get_tag_definition_name_path(tag_def)
    assert result == path


def test_name_as_default_path_and_enqueues(tag_def_user):
    mock = MagicMock()
    with patch("cosmae.tag.queue.enqueue", mock):
        result = q.get_tag_definition_name_path(tag_def_user)
    assert result == [tag_def_user.name]
    mock.assert_called_once_with(
        q.update_tag_definition_name_path, tag_def_user.id_persistent
    )


def test_enqueues_children(tag_def_parent, tag_def_child_0, tag_def_child_1):
    mock = MagicMock()
    with patch("cosmae.tag.queue.enqueue", mock):
        q.update_tag_definition_name_path(tag_def_parent.id_persistent)
    assert q.tag_definition_name_path_cache.get(tag_def_parent.id_persistent) == [
        tag_def_parent.name
    ]
    mock.assert_has_calls(
        [
            call(
                q.update_tag_definition_name_path,
                tag_def_child_0.id_persistent,
                [tag_def_parent.name],
            ),
            call(
                q.update_tag_definition_name_path,
                tag_def_child_1.id_persistent,
                [tag_def_parent.name],
            ),
        ],
        any_order=True,
    )


@pytest.mark.django_db
def test_uses_provided_parent_path(tag_def_parent, tag_def_child_0):
    q.update_tag_definition_name_path(
        tag_def_child_0.id_persistent, ["name", "path", "parent", "test"]
    )
    from_cache = q.get_tag_definition_name_path(tag_def_child_0)
    assert from_cache == ["name", "path", "parent", "test", tag_def_child_0.name]
