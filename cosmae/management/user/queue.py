"Methods for creating signaling the system user service."

import json
import logging
from time import sleep
from typing import Any, Dict

from django.conf import settings
from django.core.exceptions import EmptyResultSet
from django_rq import enqueue

from cosmae.user.ssh.models_django import SshKey
from cosmae.util import CosmaeUser

_logger = logging.getLogger("cosmae.management.user.queue")


def change_prefix_to_linux(password_hash: str):
    "Change the password prefix to linux format."
    return "$y" + password_hash[password_hash.find("$") :]


def submit_system_message(command: str, args: Dict[str, Any]):
    "Submit a message to pipe"
    with open(settings.HOST_PIPE_PATH, "w", encoding="utf8") as pipe:
        json.dump(
            {
                "command": command,
                "arguments": args,
            },
            pipe,
        )
        pipe.write("\n")


def set_system_ssh_keys(id_user: int):
    "Queue method for setting ssh keys."
    user_query = CosmaeUser.objects.filter(id=id_user)
    key_query = SshKey.objects.filter(user_id=id_user)
    try:
        key_list = [key.as_pub_key_string() for key in key_query]
        user = user_query.get()
        submit_system_message(
            "set_ssh_key_list",
            {
                "username": user.username,
                "ssh_key_list": key_list,
            },
        )
    except CosmaeUser.DoesNotExist:
        _logger.error("Can not set SSH keys for missing user with id %d", id_user)
    except EmptyResultSet:
        _logger.error("Could not find any SSH keys for user with id %d", id_user)


def submit_password_message(user: CosmaeUser, command: str, **kwargs):
    "Submit message to pipe indicating a password change."
    password_hash_linux = change_prefix_to_linux(user.password)
    if password_hash_linux is None:
        return
    submit_system_message(
        command,
        {
            "username": user.username,
            "password_hash": password_hash_linux,
            "user_id": user.id,
            **kwargs,
        },
    )


def create_system_user(id_user_persistent):
    "Create a system user."

    for i in range(10):
        try:
            user_query = CosmaeUser.objects.filter(  # pylint: disable=no-member
                id_persistent=id_user_persistent
            )
            user = user_query.get()
            ssh_key = SshKey.objects.filter(user=user).get()
        except (CosmaeUser.DoesNotExist, SshKey.DoesNotExist) as exc:
            if i == 9:
                raise exc
            sleep(5)
    submit_password_message(user, "create_user", ssh_key=ssh_key.as_pub_key_string())


def update_password(id_user_persistent):
    "Call system to update password"
    user_query = CosmaeUser.objects.filter(  # pylint: disable=no-member
        id_persistent=id_user_persistent
    )
    user = user_query.get()
    submit_password_message(user, "set_password")


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
