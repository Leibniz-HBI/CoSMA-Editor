"""Test for sending the command that will create a new user."""

# pylint: disable=unused-argument,redefined-outer-name
import shutil
from pathlib import Path
from shutil import rmtree
from unittest.mock import ANY, call, patch

import pytest

import tests.user.ssh.common as cssh
from cosmae.management.user import queue as q
from cosmae.user.ssh.models_django import SshKey
from cosmae.util import CosmaeUser

_test_data_pth = Path(__file__).resolve().parent.parent.parent / "_test_data"
_credentials_pth = _test_data_pth / "credentials"
_passwd_pth = _credentials_pth / "passwd"
_shadow_pth = _credentials_pth / "shadow"
_group_pth = _credentials_pth / "group"
_home_dir = _test_data_pth / "home"


@pytest.fixture
def credential_files():
    """Fixture for restoring credential files after test is run.
    Credentials need to be restored after tests b/c django config needs them"""
    yield
    _shadow_pth.unlink()
    _passwd_pth.unlink()
    try:
        _home_dir.mkdir(parents=True)
    except FileExistsError:
        shutil.rmtree(_home_dir)
        _home_dir.mkdir(parents=True)
    with open(_passwd_pth, "wt", encoding="ascii") as f:
        f.write(  # need to have one user to get initial user id
            "cosmae:x:5000:90000::/srv/cosmae/home/cosmae:/bin/sh\n"
        )
        f.write("sshd:x:200:2::/run/sshd:/usr/sbin/nologin\n")
    with open(_shadow_pth, "wt", encoding="ascii") as f:
        f.write(
            "cosmae:$y$jFT$"
            "K1Y4Hf5e7b3e8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0"
            ":18762:0:99999:7:::\n"
        )
        f.write("sshd:*:18762:0:99999:7:::\n")
    with open(_group_pth, "wt", encoding="ascii") as f:
        f.write("cosmae:x:90000:\n")
        f.write("nogroup:x:2:\n")


@pytest.fixture
def cosmartin_initial_user(credential_files):
    "Fixture for setting up files as created by setup_credentials.py for initial user."
    ssh_dir = _home_dir / "cosmartin/.ssh/"
    ssh_dir.mkdir(parents=True, exist_ok=True)
    ssh_dir.chmod(0o700)
    authorized_keys_path = ssh_dir / "authorized_keys"
    with open(authorized_keys_path, "wt", encoding="ascii") as f:
        f.write(cssh.ssh_key1 + "\n")
    authorized_keys_path.chmod(0o666)
    with open(_passwd_pth, "at", encoding="ascii") as f:
        f.write("cosmartin:x:90002:90000::/srv/cosmae/home/cosmartin:/bin/sh\n")
    with open(_shadow_pth, "at", encoding="ascii") as f:
        f.write(
            "cosmartin:$y$jFT$"
            # password hash of "changeme"
            "zBWENsLV7saMuyK/Sb/yl1$fyha6Z59wYYeszd3OX/oItQwL36KC1VvXdx.YR3V116"
            ":18762:0:99999:7:::\n"
        )
    yield
    rmtree(_home_dir)


@pytest.fixture
def ssh_key(user):
    "Ssh key for user queue tests."
    type_key, key, name = cssh.ssh_key.split(" ")
    return SshKey.objects.create(
        user=user, id_persistent=cssh.id_ssh_key, type=type_key, name=name, key=key
    )


@patch("cosmae.management.user.queue.chmod")
@patch("cosmae.management.user.queue.chown")
def test_create_user(
    chown,
    chmod,
    user,
    ssh_key,
    credential_files,
):
    "Make sure the command for creating a user is submitted."
    q._MIN_USER_ID = 90000  # pylint: disable=protected-access
    lines = []
    with open(_passwd_pth, "rt", encoding="ascii") as f:
        lines = f.readlines()
    q.create_system_user(user.id_persistent)
    with open(_passwd_pth, "rt", encoding="ascii") as f:
        lines = f.readlines()
    assert len(lines) == 3
    assert lines[0].startswith("cosmae")
    assert lines[1].startswith("sshd")
    split = lines[2].split(":")
    assert split[0] == user.username
    assert split[2] == str(90000 + user.id)
    assert split[3] == "90000"  # group id
    assert split[5] == (_home_dir / user.username).as_posix()
    assert split[6] == "/usr/bin/true\n"
    with open(_shadow_pth, "rt", encoding="ascii") as f:
        lines = f.readlines()
    assert len(lines) == 3
    assert lines[0].startswith("cosmae")
    assert lines[1].startswith("sshd")
    split = lines[2].split(":")
    assert split[0] == user.username
    assert split[1] == "$" + user.password[5:]
    assert int(split[2]) > 0  # last changed
    assert split[3] == ""  # min pw age
    assert split[4] == ""  # max pw age
    assert split[5] == ""  # warn days
    assert split[6] == ""  # inactive days
    assert split[7] == ""  # expire date
    assert split[8] == "\n"  # reserved
    assert chmod.call_count == 3
    chmod.assert_has_calls(
        [
            call(ANY, 0o600),  # tmp file
            call(_home_dir / user.username / ".ssh", 0o700),
            call(_home_dir / user.username / ".ssh/authorized_keys", 0o600),
        ]
    )
    assert chown.call_count == 5
    chown.assert_has_calls(
        # pylint: disable=protected-access
        [
            # Two calls are on tmp files!
            call(_home_dir / user.username, q._MIN_USER_ID + user.id, 90000),
            call(_home_dir / user.username / ".ssh", q._MIN_USER_ID + user.id, 90000),
            call(
                _home_dir / user.username / ".ssh/authorized_keys",
                q._MIN_USER_ID + user.id,
                90000,
            ),
        ]
    )
    with open(
        _home_dir / user.username / ".ssh" / "authorized_keys", "rt", encoding="ascii"
    ) as f:
        lines = f.readlines()
    assert len(lines) == 1
    assert lines[0] == cssh.ssh_key + "\n"


@patch("cosmae.management.user.queue.chmod")
@patch("cosmae.management.user.queue.chown")
def test_set_ssh_key_list(chown, chmod, ssh_key):
    "Test setting the ssh key list."
    username = "testuser"
    pth = _home_dir / username / ".ssh"
    pth.mkdir(parents=True, exist_ok=True)
    q.set_ssh_key_list(
        username, 11111, [ssh_key.as_pub_key_string(), ssh_key.as_pub_key_string()]
    )
    chown.assert_called_once_with(
        pth / "authorized_keys",
        11111,
        q._MIN_USER_ID,  # pylint: disable=protected-access
    )
    chmod.assert_called_once_with(pth / "authorized_keys", 0o600)
    with open(pth / "authorized_keys", "rt", encoding="ascii") as f:
        lines = f.readlines()
    assert len(lines) == 2
    assert lines[0] == cssh.ssh_key + "\n"
    assert lines[1] == cssh.ssh_key + "\n"
    rmtree(pth.parent.parent)


@patch("cosmae.management.user.queue.chmod")
@patch("cosmae.management.user.queue.chown")
@patch("cosmae.management.user.queue.change_prefix_to_linux")
def test_update_password(change_prefix, chown, chmod, db, cosmartin_initial_user):
    "Test that the password is correctly updated."
    q._MIN_USER_ID = 90000  # pylint: disable=protected-access
    q.create_initial_users()
    user = CosmaeUser.objects.get(username="cosmartin")
    system_password_hash = (
        "$y$jFT$PQThCdimcOx7mBC3h39eU/$5sg8xZaavJMR0l5tadFyyFQaDm77RqDZySwVNuPh7n6"
    )
    change_prefix.return_value = system_password_hash
    q.update_password(user.id_persistent)
    with open(_shadow_pth, "rt", encoding="ascii") as f:
        lines = f.readlines()
    assert len(lines) == 3
    assert lines[0].startswith("cosmae")
    assert lines[1].startswith("sshd")
    split = lines[2].split(":")
    assert split[0] == user.username
    assert split[1] == system_password_hash
    assert int(split[2]) > 0  # last changed
    assert split[3] == ""  # min pw age
    assert split[4] == ""  # max pw age
    assert split[5] == ""  # warn days
    assert split[6] == ""  # inactive days
    assert split[7] == ""  # expire date
    assert split[8] == "\n"  # reserved
    chmod.assert_called_once_with(ANY, 0o600)
    chown.assert_called_once_with(ANY, 5000, "cosmae")


def test_initial_user_creation(db, cosmartin_initial_user):
    "Test that initial user creation works."
    q._MIN_USER_ID = 90000  # pylint: disable=protected-access
    q.create_initial_users()
    user = CosmaeUser.objects.get(username="cosmartin")
    assert user is not None
    assert user.is_active
    assert user.id == 2
    assert not user.is_superuser
    assert user.check_password("changeme")
    ssh_key = SshKey.objects.get(user=user)
    assert ssh_key is not None
    assert ssh_key.as_pub_key_string() == cssh.ssh_key1


def test_min_user_id(cosmartin_initial_user):
    "Make sure minimal users ids are computed correctly."
    with open(_passwd_pth, "at", encoding="ascii") as f:
        f.write("user1:x:90003:90000::/srv/cosmae/home/user1:/bin/sh\n")
        f.write("user2:x:90004:90000::/srv/cosmae/home/user2:/bin/sh\n")
        f.write("user3:x:90005:90000::/srv/cosmae/home/user3:/bin/sh\n")
    assert q._get_minimum_user_ids() == (  # pylint: disable=protected-access
        5000,
        90000,
    )
