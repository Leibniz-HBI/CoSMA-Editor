"Methods for creating signaling the system user service."

import logging
from datetime import datetime, timezone
from os import chmod
from os.path import exists
from shutil import chown, copy
from sys import maxsize
from tempfile import NamedTemporaryFile
from time import sleep
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import EmptyResultSet
from django.db import transaction
from django_rq import enqueue

from cosmae.user.ssh.models_django import SshKey
from cosmae.util import CosmaeUser

_logger = logging.getLogger("cosmae.management.user.queue")
_epoch = datetime.fromtimestamp(0, timezone.utc)


def change_prefix_to_linux(password_hash: str):
    "Change the password prefix to linux format."
    return "$y" + password_hash[password_hash.find("$") :]


def change_prefix_to_django(password_hash: str):
    "Change the password prefix to django format."
    return "linuxy" + password_hash[1:]


def _get_minimum_user_ids() -> int:
    mins = [maxsize, maxsize - 1]
    with open(settings.CREDENTIALS_DIR / "passwd", "r", encoding="ascii") as passwd:
        for line in passwd.readlines():
            split = line.split(":")
            try:
                user_id = int(split[2])
                if user_id < mins[0]:
                    mins[1] = mins[0]
                    mins[0] = user_id
                elif user_id < mins[1]:
                    mins[1] = user_id
            except ValueError:
                _logger.warning("Invalid user id %s in credentials file.", split[2])
    return mins[0], mins[1] - 2  # remove constant added in setup script.


_SYSTEM_USER_ID, _MIN_USER_ID = _get_minimum_user_ids()


def check_hashed_password(hashed_password: str):
    "make sure that only permitted chars are used in password"
    for char in hashed_password:
        c_ord = ord(char)
        if c_ord > 90:  # ord('Z')
            if c_ord < 97 or c_ord > 122:  # ord('a') and ord('z')
                return False
            return True
        if c_ord >= 65:  # ord('A')
            return True
        if c_ord > 57 or (  # ord('9'),
            c_ord < 46 and c_ord != 36  #  ord('.') and ord('$')
        ):
            return False
        return True


def set_system_ssh_keys(id_user: int):
    "Queue method for setting ssh keys."
    user_query = CosmaeUser.objects.filter(id=id_user)
    key_query = SshKey.objects.filter(user_id=id_user)
    try:
        ssh_key_list = [key.as_pub_key_string() for key in key_query]
        user = user_query.get()
        username = user.username
        set_ssh_key_list(username, ssh_key_list)
    except CosmaeUser.DoesNotExist:
        _logger.error("Can not set SSH keys for missing user with id %d", id_user)
    except EmptyResultSet:
        _logger.error("Could not find any SSH keys for user with id %d", id_user)


def set_ssh_key_list(username, ssh_key_list):
    "Set all SSH keys for a user."
    _logger.info("Set SSH keys for user %s", username)
    target_dir = settings.USER_HOME_BASE_DIR / username / ".ssh"
    if not exists(target_dir):
        # is not yet created want to do this on user creation
        return
    target_pth = target_dir / "authorized_keys"
    with NamedTemporaryFile("w", encoding="ascii", delete_on_close=False) as tmp_file:
        for key in ssh_key_list:
            tmp_file.write(key)
            tmp_file.write("\n")
        tmp_file.close()
        copy(tmp_file.name, target_pth)
        chown(target_pth, username, settings.SYSTEM_GROUP_NAME)
        chmod(target_pth, 0o600)


def create_system_user(id_user_persistent):
    "Create a system user."

    for i in range(10):
        try:
            user_query = CosmaeUser.objects.filter(  # pylint: disable=no-member
                id_persistent=id_user_persistent
            )
            user = user_query.get()
            ssh_key = SshKey.objects.filter(user=user).get()
            break
        except (CosmaeUser.DoesNotExist, SshKey.DoesNotExist) as exc:
            if i == 9:
                raise exc
            sleep(5)
    username = user.username
    user_id = _MIN_USER_ID + user.id
    password_hash = change_prefix_to_linux(user.password)
    _logger.info("Creating user %s.", username)
    new_user_home_dir_path = settings.USER_HOME_BASE_DIR / username
    set_passwd_entry(username, user_id, new_user_home_dir_path)
    password_change_time = int(
        (datetime.now(timezone.utc) - _epoch).total_seconds() / (24 * 3600)
    )
    set_shadow_entry(username, password_hash, password_change_time)
    ssh_pth = new_user_home_dir_path / ".ssh"
    if not exists(ssh_pth):
        # This is the case for the initial user where the ssh key is already set up
        ssh_pth.mkdir(parents=True)
        chown(new_user_home_dir_path, username, settings.SYSTEM_GROUP_NAME)
        chown(ssh_pth, username, settings.SYSTEM_GROUP_NAME)
        chmod(ssh_pth, 0o700)
        set_ssh_key_list(username, [ssh_key.as_pub_key_string()])


def set_shadow_entry(username, password_hash, password_change_time):
    """Set entry in shadow file.
    If the user already exists, update the entry.
    If the user does not exist, add a new entry."""
    with NamedTemporaryFile("w", encoding="ascii", delete_on_close=False) as tmp_file:
        shadow_path = settings.CREDENTIALS_DIR / "shadow"
        with open(shadow_path, "rt", encoding="ascii") as shadow:
            user_found = False
            shadow_line = f"{username}:{password_hash}:{password_change_time}::::::\n"
            for line in shadow.readlines():
                if line.startswith(username + ":"):
                    tmp_file.write(shadow_line)
                    user_found = True
                else:
                    tmp_file.write(line)
            if not user_found:
                tmp_file.write(shadow_line)
        tmp_file.close()
        chown(tmp_file.name, _SYSTEM_USER_ID, settings.SYSTEM_GROUP_NAME)
        copy(tmp_file.name, shadow_path)


def set_passwd_entry(username, user_id, home_dir_path):
    """Set entry in passwd file.
    If the user already exists, update the entry.
    If the user does not exist, add a new entry."""
    with NamedTemporaryFile("w", encoding="ascii", delete_on_close=False) as tmp_file:
        user_found = False
        passwd_path = settings.CREDENTIALS_DIR / "passwd"
        with open(passwd_path, "rt", encoding="ascii") as passwd:
            passwd_line = (
                f"{username}:x:{user_id}:{settings.SYSTEM_GROUP_ID}::{home_dir_path}:"
                "/usr/bin/true\n"
            )
            for line in passwd.readlines():
                if line.startswith(username):
                    tmp_file.write(passwd_line)
                    user_found = True
                else:
                    tmp_file.write(line)
            if not user_found:
                tmp_file.write(passwd_line)
        tmp_file.close()
        chown(tmp_file.name, _SYSTEM_USER_ID, settings.SYSTEM_GROUP_NAME)
        copy(tmp_file.name, passwd_path)


def update_password(id_user_persistent):
    "Call system to update password"
    user_query = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=id_user_persistent
    )
    user = user_query.get()
    username = user.username
    password_hash = change_prefix_to_linux(user.password)
    password_change_time = int(
        (datetime.now(timezone.utc) - _epoch).total_seconds() / (24 * 3600)
    )
    set_shadow_entry(username, password_hash, password_change_time)


def create_initial_user():
    """Create an initial user.
    The information is taken from files in the credentials directory."""
    with open(settings.CREDENTIALS_DIR / "shadow", "rt", encoding="ascii") as f:
        lines = f.readlines()
    if len(lines) != 2:
        raise Exception(  # pylint: disable=broad-exception-raised
            "There must be exactly two users in the shadow file."
        )
    split = lines[1].split(":")
    username = split[0]
    password_hash = split[1]
    django_password = change_prefix_to_django(password_hash[1:])
    with open(settings.CREDENTIALS_DIR / "passwd", "rt", encoding="ascii") as f:
        lines = f.readlines()
    if len(lines) != 2:
        raise Exception(  # pylint: disable=broad-exception-raised
            "There must be exactly two users in the shadow file."
        )
    split = lines[1].split(":")
    if split[0] != username:
        raise Exception(  # pylint: disable=broad-exception-raised
            "User names in passwd and shadow file do not match."
        )
    user_id_system = int(split[2])
    if user_id_system < _MIN_USER_ID:
        raise Exception(  # pylint: disable=broad-exception-raised
            f"User id {user_id_system} is too small. It must be at least {_MIN_USER_ID}."
        )
    user_id = user_id_system - _MIN_USER_ID
    user = CosmaeUser(
        username=username,
        password=django_password,
        id=user_id,
        id_persistent=uuid4(),
        first_name=username,
        permission_group=CosmaeUser.COMMISSIONER,
    )  # pylint: disable=no-member
    ssh_path = settings.USER_HOME_BASE_DIR / username / ".ssh" / "authorized_keys"
    if not ssh_path.exists():
        raise Exception(  # pylint: disable=broad-exception-raised
            f"Could not find ssh public key file {ssh_path}."
        )
    try:
        with open(ssh_path, "rt", encoding="ascii") as f:
            lines = f.readlines()
            if len(lines) != 1:
                raise Exception(  # pylint: disable=broad-exception-raised
                    f"Expected exactly one ssh public key in file {ssh_path}."
                )
            split = lines[0].split()
            key_type = split[0]
            key = split[1]
            name = split[2]

    except PermissionError as exc:
        raise Exception(  # pylint: disable=broad-exception-raised
            f"Could not read ssh public key file {ssh_path}."
        ) from exc
    with transaction.atomic():
        user.save()
        ssh_key = SshKey(
            user=user,
            id_persistent=uuid4(),
            type=key_type,
            name=name,
            key=key,
        )
        ssh_key.save()
    chmod(ssh_path, 0o600)


def dispatch_create_system_user(
    sender, request, user, **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for creating a system user."
    enqueue(create_system_user, str(user.id_persistent))


def dispatch_update_password(
    sender, request, user, **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for updating the password"
    enqueue(update_password, str(user.id_persistent))


def dispatch_set_ssh_keys(
    sender, instance, **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for setting SSH keys."
    enqueue(set_system_ssh_keys, instance.user_id)
