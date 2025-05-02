"Methods for creating signaling the system user service."

import json
from time import sleep

from django.conf import settings
from django_rq import enqueue

from cosmae.util import CosmaeUser


def change_prefix_to_linux(password_hash: str):
    "Change the password prefix to linux format."
    return "$y" + password_hash[password_hash.find("$") :]


def create_system_user(id_user_persistent):
    "Create a system user."

    for i in range(10):
        try:
            user_query = CosmaeUser.objects.filter(  # pylint: disable=no-member
                id_persistent=id_user_persistent
            )
            user = user_query.get()
        except CosmaeUser.DoesNotExist as exc:
            if i == 9:
                raise exc
            sleep(5)

    password_hash_linux = change_prefix_to_linux(user.password)
    if password_hash_linux is None:
        return
    with open(settings.HOST_PIPE_PATH, "w", encoding="utf8") as pipe:
        json.dump(
            {
                "command": "create_user",
                "arguments": {
                    "username": user.username,
                    "password_hash": password_hash_linux,
                    "user_id": user.id,
                },
            },
            pipe,
        )
        pipe.write("\n")


def dispatch_create_system_user(
    sender, request, user, **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for creating a system user."
    enqueue(create_system_user, str(user.id_persistent))
