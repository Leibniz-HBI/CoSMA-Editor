# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from unittest.mock import MagicMock, call, patch

import pytest

import cosmae.column.queue as q
from cosmae.column.models_django import ColumnNamePathCache


def test_get_name_from_cache(column):
    path = ["name", "path", "test"]
    ColumnNamePathCache.set_cache_entry(column.id, path)
    result = q.get_column_name_path(column)
    assert result == path


def test_name_as_default_path_and_enqueues(column_user):
    mock = MagicMock()
    with patch("cosmae.column.queue.enqueue", mock):
        result = q.get_column_name_path(column_user)
    assert result == [column_user.name]
    mock.assert_called_once_with(q.update_column_name_path, column_user.id)


def test_enqueues_children_no_future(column_parent, column_child_0, column_child_1):
    mock = MagicMock()
    with patch("cosmae.column.queue.enqueue", mock):
        q.update_column_name_path(column_parent.id)
    assert q.get_column_name_path(column_parent) == [column_parent.name]
    mock.assert_not_called()


def test_enqueues_children_(column_parent_future, column_child_0, column_child_1):
    mock = MagicMock()
    with patch("cosmae.column.queue.enqueue", mock):
        q.update_column_name_path(column_parent_future.id)
    assert q.get_column_name_path(column_parent_future) == [column_parent_future.name]
    mock.assert_has_calls(
        [
            call(
                q.update_column_name_path,
                column_child_0.id,
                [column_parent_future.name],
            ),
            call(
                q.update_column_name_path,
                column_child_1.id,
                [column_parent_future.name],
            ),
        ],
        any_order=True,
    )


@pytest.mark.django_db
def test_uses_provided_parent_path(column_parent, column_child_0):
    q.update_column_name_path(column_child_0.id, ["name", "path", "parent", "test"])
    from_cache = q.get_column_name_path(column_child_0)
    assert from_cache == ["name", "path", "parent", "test", column_child_0.name]
