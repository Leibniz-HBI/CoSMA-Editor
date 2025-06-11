"Fixtures for SSH management API tests"

import pytest

import tests.user.ssh.common as c
from cosmae.user.ssh.models_django import SshKey


@pytest.fixture()
def ssh_api_uuid_mock(mocker):
    "mock uuid creation for ssh key api."
    mock = mocker.MagicMock(return_value=c.id_ssh_key)
    mocker.patch("cosmae.user.ssh.api.uuid4", mock)


@pytest.fixture
def ssh_key(user):
    "Test SSH key for user"
    type_key, key, name = c.ssh_key.split(" ")
    return SshKey.objects.create(
        id_persistent=c.id_ssh_key,
        user=user,
        type=type_key,
        key=key,
        name=name,
    )


@pytest.fixture
def ssh_key1(user):
    "Another test SSH key for user"
    type_key, key, name = c.ssh_key1.split(" ")
    return SshKey.objects.create(
        id_persistent=c.id_ssh_key1,
        user=user,
        type=type_key,
        key=key,
        name=name,
    )


@pytest.fixture
def ssh_key_user1(user1):
    "Another test SSH key for user"
    type_key, key, name = c.ssh_key_user1.split(" ")
    return SshKey.objects.create(
        id_persistent=c.id_ssh_key_user1,
        user=user1,
        type=type_key,
        key=key,
        name=name,
    )
