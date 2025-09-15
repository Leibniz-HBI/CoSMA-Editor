"Tests methods of script for setting up initial credentials."

# pylint: disable=unused-argument,redefined-outer-name
from unittest.mock import ANY, call, mock_open, patch

from pytest import fixture

import setup.setup_credentials as setup


@fixture
def group_file(mocker):
    "Mock for reading /etc/group"
    return mocker.patch(
        "builtins.open",
        mock_open(read_data="root:x:0:\ndaemon:x:1:\ncosmae:x:70000:\n"),
    )


@fixture
def mock_popen(mocker):
    "Mock for subprocess spawning"
    process_mock = mocker.MagicMock()
    process_mock.wait = mocker.MagicMock(return_value=0)
    popen_mock = mocker.MagicMock()
    popen_mock.return_value.__enter__.return_value = process_mock
    return mocker.patch("setup.setup_credentials.subprocess.Popen", popen_mock)


def test_create_group(group_file, mock_popen):
    "Make sure create_group does create a group."
    group_name = "other"
    setup.create_group(group_name)
    group_file.assert_has_calls(
        [
            # pylint: disable=unnecessary-dunder-call
            call("/etc/group", "rt", encoding="ascii"),
            call().__enter__(),
            call().readlines(),
            call().__exit__(None, None, None),
        ]
    )
    mock_popen.assert_called_once_with(["/usr/sbin/groupadd", "-f", group_name])


def test_create_user(mock_popen):
    "Make sure create_user does create a user."
    setup.create_user("cosmae", group_name="cosmae")
    mock_popen.assert_called_once_with(
        [
            "/usr/sbin/useradd",
            "-g",
            "cosmae",
            "-m",
            "cosmae",
        ]
    )


def test_get_conf_value_from_file(mocker):
    "Make sure _get_conf_value_from_file reads the correct value."
    file_mock = mocker.patch(
        "builtins.open",
        mock_open(
            read_data="# comment\nPASS_MAX_DAYS   99999\nPASS_MIN_DAYS   5\n"
            "PASS_WARN_AGE   7\n",
        ),
    )
    result = setup._get_conf_int_from_file(  # pylint: disable=protected-access
        "/etc/login.defs", "PASS_MIN_DAYS"
    )
    assert result == 5
    file_mock.assert_called_once_with("/etc/login.defs", "r", encoding="ascii")
    # the second line is the one we want


def test_get_group_id(group_file):
    "Make sure _get_group_info reads the correct group info."
    gid = setup.get_group_id("cosmae")
    assert gid == 70000
    group_file.assert_called_once_with("/etc/group", "rt", encoding="ascii")


def test_get_group_id_missing(group_file):
    "Make sure _get_group_info reads the correct group info."
    gid = setup.get_group_id("unknown")
    assert gid is None
    group_file.assert_called_once_with("/etc/group", "rt", encoding="ascii")


def test_setup_ssh_config(mock_popen, tmpdir):
    "Make sure setup_ssh_config creates the correct ssh config file."
    config_path = tmpdir.strpath
    setup.setup_ssh_proxy(config_path)
    with open(tmpdir / "ssh/sshd_config", "rt", encoding="ascii") as f:
        content = f.read()
    assert "Port 1709\n" in content
    assert "PermitRootLogin no\n" in content
    assert (
        "Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,"
        "aes256-ctr,aes192-ctr,aes128-ctr\n"
    ) in content
    assert 'AuthenticationMethods "publickey,password"\n' in content
    assert "PasswordAuthentication yes\n" in content
    assert "UsePAM yes\n" in content
    assert "X11Forwarding no\n" in content
    assert "PrintMotd no\n" in content
    assert "ForceCommand /usr/bin/true\n" in content
    for key_type in ["rsa", "ecdsa", "ed25519"]:
        mock_popen.assert_any_call(
            [
                "/usr/bin/ssh-keygen",
                "-t",
                key_type,
                "-f",
                config_path + f"/ssh/ssh_host_{key_type}_key",
                "-N",
                "",
                "-q",
            ]
        )


def assert_lines(file_path, expected_lines):
    "Assert that the file at file_path contains exactly the expected_lines."
    with open(file_path, "rt", encoding="ascii") as f:
        lines = f.readlines()
    assert lines == expected_lines


@patch("setup.setup_credentials.chown")
def test_setup_credentials_integration(chown, mocker, tmpdir):
    # pylint: disable=too-many-locals
    "Make sure run_setup_credentials does all necessary steps."
    base_dir = tmpdir.strpath
    group_name = "cosmae_test"
    system_user = "cosmae_test"
    initial_user = "initial_test"
    group_id = 6489
    ssh_key_path = tmpdir / "id_rsa.pub"
    ssh_key = "ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEArD1N bla@foo.org\n"
    with open(ssh_key_path, "wt", encoding="ascii") as f:
        f.write(ssh_key)
    popen_mock = mocker.patch("setup.setup_credentials.subprocess.Popen")
    process_mock = mocker.MagicMock()
    process_mock.wait = mocker.MagicMock(return_value=0)
    popen_mock.return_value.__enter__.return_value = process_mock
    mocker.patch("setup.setup_credentials.create_group", return_value=group_id)
    setup.run_setup_credentials(
        base_dir, group_name, system_user, initial_user, ssh_key_path
    )
    # Check that group and user creation were attempted
    popen_mock.assert_any_call(
        [
            "/usr/sbin/useradd",
            "-g",
            group_name,
            "-m",
            system_user,
        ]
    )
    # Check that SSH proxy setup was attempted
    for key_type in ["rsa", "ecdsa", "ed25519"]:
        popen_mock.assert_any_call(
            [
                "/usr/bin/ssh-keygen",
                "-t",
                key_type,
                "-f",
                base_dir + f"/ssh/ssh_host_{key_type}_key",
                "-N",
                "",
                "-q",
            ]
        )
    ssh_dir = tmpdir / "home/initial_test/.ssh"
    credentials_dir = tmpdir / "credentials"
    home_dir_root = tmpdir / "home"
    assert ssh_dir.stat().mode & 0o777 == 0o700
    key_file = ssh_dir + "/authorized_keys"
    assert_lines(key_file, [ssh_key])
    assert key_file.stat().mode & 0o777 == 0o666
    assert (credentials_dir / "/passwd").exists()
    assert (credentials_dir / "/shadow").exists()
    assert (credentials_dir / "/group").exists()
    assert (tmpdir / "ssh/sshd_config").exists()
    assert chown.call_count == 10
    chown.assert_has_calls(
        [
            call(tmpdir, ANY, ANY),
            call(tmpdir / "contributions", ANY, ANY),
            call(credentials_dir, ANY, ANY),
            call(credentials_dir / "passwd", ANY, ANY),
            call(credentials_dir / "shadow", ANY, ANY),
            call(credentials_dir / "group", ANY, ANY),
            call(key_file.strpath, ANY, ANY),
            call(ssh_dir.strpath, ANY, ANY),
            call(home_dir_root, ANY, ANY),
            call(home_dir_root / "initial_test", ANY, ANY),
        ]
    )
