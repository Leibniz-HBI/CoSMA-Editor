# pylint: disable=no-member,unused-argument,invalid-name,redefined-outer-name,unnecessary-dunder-call
"Tests for the system user service"

from unittest.mock import ANY, call

import pytest

import scripts.cosma_editor_system_user_service as service
import tests.user.common as cu
import tests.user.ssh.common as cssh

module_string = "scripts.cosma_editor_system_user_service"


@pytest.fixture()
def subprocess_mock(mocker):
    "Mock for subprocess spawning"
    process_mock = mocker.MagicMock()
    process_mock.wait = mocker.MagicMock(return_value=0)
    popen_mock = mocker.MagicMock()
    popen_mock.return_value.__enter__.return_value = process_mock
    mocker.patch(module_string + ".subprocess.Popen", popen_mock)


@pytest.fixture()
def fs_mocks(mocker):
    "Mocks for file system interactions"
    mkdir_mock = mocker.MagicMock()
    mocker.patch(module_string + ".mkdir", mkdir_mock)
    chown_mock = mocker.MagicMock()
    mocker.patch(module_string + ".chown", chown_mock)
    chmod_mock = mocker.MagicMock()
    mocker.patch(module_string + ".chmod", chmod_mock)
    copy_mock = mocker.MagicMock()
    mocker.patch(module_string + ".copy", copy_mock)
    exists_mock = mocker.MagicMock(return_value=True)
    mocker.patch(module_string + ".exists", exists_mock)


@pytest.fixture()
def temp_file_mock(mocker):
    "Mock named temporary file creation"
    named_temporary_file_mock = mocker.MagicMock()
    mocker.patch(module_string + ".NamedTemporaryFile", named_temporary_file_mock)


group_name = "avera"
password_hash = (
    "'$y$jFT$Fu3EO.hWdZQIQbfAtX9th/$06dicXgSelVwfgJLY/imdZFueo4mH98fBcIT8bOPjU7'"
)
ssh_pth = "/srv/cosmae/user_home/avera_test-user/.ssh"
authorized_keys_pth = ssh_pth + "/authorized_keys"
system_user_name = group_name + "_" + cu.test_username


def test_create_user(user, subprocess_mock, fs_mocks):
    "Make sure correct system calls are dispatched for creating a new user."
    service.create_user(group_name, cu.test_username, password_hash, 2000, cssh.ssh_key)
    service.subprocess.Popen.assert_has_calls(
        [
            call(
                [
                    "/usr/sbin/useradd",
                    "-u",
                    "22000",
                    "-g",
                    group_name,
                    "-m",
                    "-b",
                    "/srv/cosmae/user_home",
                    system_user_name,
                ]
            ),
            call().__enter__(),
            call().__enter__().wait,
            call(
                [
                    "/usr/bin/sed",
                    "s/^\\(avera_test-user\\):[^:]*:\\(.*\\)"
                    f"/\\1:{password_hash.replace("/","\\/")}:\\2/",
                    "/etc/shadow",
                ],
                stdout=ANY,
            ),
            call().__enter__(),
            call().__enter__().wait(),
            call().__exit__(None, None, None),
            call().__exit__(None, None, None),
        ]
    )
    service.mkdir.assert_called_with(ssh_pth)
    service.chown.assert_has_calls(
        [
            call(ssh_pth, system_user_name, group_name),
            call(ANY, "root", "shadow"),
            call(ANY, system_user_name, group_name),
        ]
    )
    service.chmod.assert_has_calls(
        [call(ssh_pth, 0o700), call(authorized_keys_pth, 0o600)]
    )
    service.copy.assert_has_calls(
        [call(ANY, "/etc/shadow"), call(ANY, authorized_keys_pth)]
    )


def test_set_ssh_keys(fs_mocks, temp_file_mock):
    "Make sure nothing is done if no ssh dir exists"
    ssh_key_list = [cssh.ssh_key, cssh.ssh_key1]
    service.set_ssh_key_list(group_name, cu.test_username, ssh_key_list)
    service.NamedTemporaryFile.assert_has_calls(
        [
            call("w", encoding="ascii", delete_on_close=False),
            call().__enter__(),
            call().__enter__().write(ssh_key_list[0]),
            call().__enter__().write("\n"),
            call().__enter__().write(ssh_key_list[1]),
            call().__enter__().write("\n"),
            call().__enter__().close(),
            call().__exit__(None, None, None),
        ]
    )
    service.copy.assert_called_with(ANY, authorized_keys_pth)
    service.chown.assert_called_with(authorized_keys_pth, system_user_name, group_name)
    service.chmod.assert_called_with(authorized_keys_pth, 0o600)


def test_set_ssh_keys_no_dir(fs_mocks):
    "Make sure nothing is done if no ssh dir exists"
    service.exists.return_value = False
    service.set_ssh_key_list(group_name, cu.test_username, [])
    service.copy.assert_not_called()
    service.chown.assert_not_called()
    service.chmod.assert_not_called()
