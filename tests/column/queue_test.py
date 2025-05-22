# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, call, patch

import pytest

import cosmae.column.queue as q


def test_get_name_from_cache(column):
    path = ["name", "path", "test"]
    q.column_name_path_cache.set(column.id_persistent, path)
    result = q.get_column_name_path(column)
    assert result == path


def test_name_as_default_path_and_enqueues(column_user):
    mock = MagicMock()
    with patch("cosmae.column.queue.enqueue", mock):
        result = q.get_column_name_path(column_user)
    assert result == [column_user.name]
    mock.assert_called_once_with(q.update_column_name_path, column_user.id_persistent)


def test_enqueues_children(column_parent, column_child_0, column_child_1):
    mock = MagicMock()
    with patch("cosmae.column.queue.enqueue", mock):
        q.update_column_name_path(column_parent.id_persistent)
    assert q.column_name_path_cache.get(column_parent.id_persistent) == [
        column_parent.name
    ]
    mock.assert_has_calls(
        [
            call(
                q.update_column_name_path,
                column_child_0.id_persistent,
                [column_parent.name],
            ),
            call(
                q.update_column_name_path,
                column_child_1.id_persistent,
                [column_parent.name],
            ),
        ],
        any_order=True,
    )


@pytest.mark.django_db
def test_uses_provided_parent_path(column_parent, column_child_0):
    q.update_column_name_path(
        column_child_0.id_persistent, ["name", "path", "parent", "test"]
    )
    from_cache = q.get_column_name_path(column_child_0)
    assert from_cache == ["name", "path", "parent", "test", column_child_0.name]
