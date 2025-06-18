"""Test for sending the command that will create a new user."""

# pylint: disable=unused-argument
import json
from unittest.mock import MagicMock

import pytest

import tests.user.ssh.common as cssh
from cosmae.management.user import queue as q
from cosmae.user.ssh.models_django import SshKey


@pytest.fixture
def pipe_mock(mocker):
    "Create a mock that will open a pipe"
    open_mock = MagicMock()
    mocker.patch("builtins.open", open_mock)
    return open_mock


@pytest.fixture
def ssh_key(user):
    "Ssh key for user queue tests."
    type_key, key, name = cssh.ssh_key.split(" ")
    SshKey.objects.create(
        user=user, id_persistent=cssh.id_ssh_key, type=type_key, name=name, key=key
    )


def test_sends_create_user(
    user, ssh_key, pipe_mock
):  # pylint: disable=redefined-outer-name
    "Make sure the command for creating a user is submitted."
    q.create_system_user(user.id_persistent)
    calls = pipe_mock.mock_calls
    pipe_mock.assert_called_with("/tmp/test_host_pipe", "w", encoding="utf8")
    assert calls[1][0] == "().__enter__"
    assert len(calls) == 29
    combined_write_parts = ""
    for call in calls[2:-1]:
        assert call[0] == "().__enter__().write"
        combined_write_parts += call.args[0]
    parsed = json.loads(combined_write_parts)
    assert parsed["command"] == "create_user"
    args = parsed["arguments"]
    assert len(args) == 4
    assert args["username"] == "test-user"
    assert args["user_id"] == user.id
    hash_ = args["password_hash"]
    assert hash_[:6] == "$y$jFT"
    assert args["ssh_key"] == cssh.ssh_key
