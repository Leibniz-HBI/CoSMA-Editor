"Methods for creating signaling the system user service."

import logging
from datetime import datetime, timezone
from os import chmod
from os.path import exists
from shutil import chown, copy
from sys import maxsize
from tempfile import NamedTemporaryFile
from time import sleep
from typing import Optional, Tuple
from uuid import uuid4

from allauth.account.models import EmailAddress
from django.conf import settings
from django.core.exceptions import EmptyResultSet
from django.db import transaction
from django_rq import enqueue

from cosmae.edit_session.models_django import EditSession, EditSessionParticipant
from cosmae.user.ssh.models_django import SshKey
from cosmae.util import CosmaeUser

_LOGGER = logging.getLogger("cosmae.management.user.queue")
_epoch = datetime.fromtimestamp(0, timezone.utc)


def change_prefix_to_linux(password_hash: str):
    "Change the password prefix to linux format."
    return "$y" + password_hash[password_hash.find("$") :]


def change_prefix_to_django(password_hash: str):
    "Change the password prefix to django format."
    return "linuxy" + password_hash[1:]


def _get_minimum_user_ids() -> Tuple[Optional[int], Optional[int]]:
    if settings.USE_SSH is False:
        return None, None
    mins = [maxsize, maxsize - 1, maxsize - 2]
    with open(settings.CREDENTIALS_DIR / "passwd", "r", encoding="ascii") as passwd:
        for line in passwd.readlines():
            split = line.split(":")
            try:
                user_id = int(split[2])
                if user_id < mins[0]:
                    mins[2] = mins[1]
                    mins[1] = mins[0]
                    mins[0] = user_id
                elif user_id < mins[1]:
                    mins[2] = mins[1]
                    mins[1] = user_id
                elif user_id < mins[2]:
                    mins[2] = user_id
            except ValueError:
                _LOGGER.warning("Invalid user id %s in credentials file.", split[2])
    return mins[1], mins[2] - 2  # remove constant added in setup script.


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
    msg = None
    for _ in range(10):
        try:
            msg = None
            sleep(5)
            ssh_key_list = [key.as_pub_key_string() for key in key_query]
            user = user_query.get()
            break
        except CosmaeUser.DoesNotExist:
            msg = "Can not set SSH keys for missing user with id %d"
        except EmptyResultSet:
            msg = "Could not find any SSH keys for user with id %d"
    if msg is not None:
        _LOGGER.error(msg, id_user)
    else:
        username = user.username
        set_ssh_key_list(username, _MIN_USER_ID + id_user, ssh_key_list)


def set_ssh_key_list(username, user_id_system, ssh_key_list):
    "Set all SSH keys for a user."
    _LOGGER.info("Set SSH keys for user %s", username)
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
        chown(target_pth, user_id_system, settings.SYSTEM_GROUP_ID)
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
    _LOGGER.info("Creating user %s.", username)
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
        chown(new_user_home_dir_path, user_id, settings.SYSTEM_GROUP_ID)
        chown(ssh_pth, user_id, settings.SYSTEM_GROUP_ID)
        chmod(ssh_pth, 0o700)
        set_ssh_key_list(username, user_id, [ssh_key.as_pub_key_string()])


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
        chmod(tmp_file.name, 0o600)
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


def create_initial_users():
    """Create an initial user.
    The information is taken from files in the credentials directory."""
    if len(CosmaeUser.objects.all()) > 0:
        _LOGGER.error("Users already created.")
        return
    with transaction.atomic():
        _create_admin_user()
        _create_initial_user()


def _get_ssh_key_from_file(username):
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

    except PermissionError as exc:
        raise Exception(  # pylint: disable=broad-exception-raised
            f"Could not read ssh public key file {ssh_path}."
        ) from exc
    return lines[0]


def _create_initial_user():
    if len(CosmaeUser.objects.filter(is_superuser=False)) > 0:
        _LOGGER.error("Admin user already exists.")
        return
    username, linux_password_hash = _get_shadow_file_details()
    if username is None:
        # pylint: disable=import-outside-toplevel
        username = "cosmartin"
        from cosmae.util.password_hasher import hash_password
        from django_project.settings import get_secret

        password = get_secret("cosmae_initial_admin_password")
        linux_password_hash = hash_password(password)
        user_id = None
    else:
        user_id = _get_user_id(username)
    django_password = change_prefix_to_django(linux_password_hash[1:])
    with transaction.atomic():
        new_user = CosmaeUser(
            username=username,
            password=django_password,
            id=user_id,
            id_persistent=uuid4(),
            first_name=username,
            permission_group=CosmaeUser.COMMISSIONER,
        )  # pylint: disable=no-member
        new_user.save()
        verified_email = EmailAddress(
            user_id=new_user.id,
            email=new_user.email,
            primary=True,
            verified=True,
        )
        if settings.USE_SSH:
            ssh_key_string = _get_ssh_key_from_file(username)
            _save_ssh_key(new_user, ssh_key_string)
        verified_email.save()
        edit_session = _create_edit_session(new_user)
        new_user.is_active = True
        new_user.edit_session = edit_session
        new_user.save()


def _get_user_id(username):
    with open(settings.CREDENTIALS_DIR / "passwd", "rt", encoding="ascii") as f:
        lines = f.readlines()
    if len(lines) != 3:
        raise Exception(  # pylint: disable=broad-exception-raised
            "There must be exactly three users in the passwd file."
        )
    split = lines[2].split(":")
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
    return user_id


def _get_shadow_file_details():
    if not settings.USE_SSH:
        return None, None
    with open(settings.CREDENTIALS_DIR / "shadow", "rt", encoding="ascii") as f:
        lines = f.readlines()
    if len(lines) != 3:
        raise Exception(  # pylint: disable=broad-exception-raised
            "There must be exactly three users in the shadow file."
        )
    split = lines[2].split(":")
    username = split[0]
    linux_password_hash = split[1]
    return username, linux_password_hash


def _create_admin_user():
    try:
        if len(CosmaeUser.objects.filter(is_superuser=True)) > 0:
            _LOGGER.error("Admin user already exists.")
            return
        _LOGGER.debug("Creating admin user.")
        # pylint: disable=import-outside-toplevel
        from cosmae.util.password_hasher import hash_password
        from django_project.settings import get_secret

        password = get_secret("cosmae_initial_admin_password")
        password_hash = hash_password(password)
        uuid = str(uuid4())
        new_user = CosmaeUser.objects.create(
            username="admin",
            email=f"mail@{uuid}.com",
            password=change_prefix_to_django(password_hash[1:]),
            is_staff=True,
            is_superuser=True,
            id_persistent=uuid,
            permission_group=CosmaeUser.APPLICANT,
        )
        new_user.is_admin = True
        new_user.is_active = True
        new_user.save()
        verified_email = EmailAddress(
            user_id=new_user.id,
            email=new_user.email,
            primary=True,
            verified=True,
        )
        verified_email.save()
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error("Could not create initial users", exc_info=exc)


def _create_edit_session(new_user):
    edit_session = EditSession(
        id_persistent=uuid4(),
        id_owner_persistent=new_user.id_persistent,
        name="Default Edit Session",
    )
    participant = EditSessionParticipant(
        edit_session=edit_session,
        type_participant="INT",
        id_participant=new_user.id_persistent,
        name_participant=new_user.username,
    )
    edit_session.save()
    participant.save()
    return edit_session


def _save_ssh_key(new_user, ssh_key_string):
    ssh_key_split = ssh_key_string.split()
    ssh_key = SshKey(
        user=new_user,
        id_persistent=uuid4(),
        type=ssh_key_split[0],
        key=ssh_key_split[1],
        name=ssh_key_split[2],
    )
    ssh_key.save()


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


def dispatch_initial_user():
    "Queues the task for updating the initial system user."
    enqueue(create_initial_users)
