"Collection of methods for attaching signals to models."

from logging import getLogger
from uuid import uuid4

from allauth.account.signals import password_changed, user_signed_up
from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.db.backends.signals import connection_created
from django.db.models.signals import post_delete, post_save

_LOGGER = getLogger(__name__)


def connect_read_csv_signal():
    "Connect the signal for reading csv files on uploads."
    # pylint: disable=import-outside-toplevel
    from cosmae.contribution.column.queue import dispatch_read_csv_head
    from cosmae.contribution.models_django import ContributionCandidate

    post_save.connect(
        dispatch_read_csv_head,
        sender=ContributionCandidate,
        dispatch_uid="cosmae.start_column_extraction",
    )


def connect_column_queue_process():
    "Connect the signal for computing column name paths."
    # pylint: disable=import-outside-toplevel
    from cosmae.column.models_django import Column
    from cosmae.column.queue import dispatch_column_queue_process

    post_save.connect(
        dispatch_column_queue_process,
        sender=Column,
        dispatch_uid="cosmae_column_queue",
    )


def add_initial_users(
    sender, connection, verbosity=2, **kwargs
):  # pylint: disable=unused-argument
    "Add superuser if no users exist"
    try:
        user_model = apps.get_model("cosmae", "cosmaeuser")
        _LOGGER.debug("Checking for existing users.")
        if user_model.objects.count() == 0:
            users = [
                {
                    "username": "admin",
                    "email": "mail@test.url",
                    "is_admin": True,
                    "permission_group": "APLC",
                },
            ]
            if not settings.IS_UNITTEST:
                users.append(
                    {
                        "username": "cosmartin",
                        "email": "martin@test.url",
                        "is_admin": False,
                        "permission_group": "COMM",
                    },
                )
            for user_dict in users:
                _create_user(user_model, user_dict)
            from cosmae.management.user.queue import (  # pylint: disable=import-outside-toplevel
                dispatch_initial_user,
            )

            dispatch_initial_user()
    except Exception as exc:  # pylint: disable=broad-except
        _LOGGER.error("Could not create initial users", exc_info=exc)


def _create_user(user_model, user_dict):
    is_admin = user_dict["is_admin"]
    user_args = {
        "username": user_dict["username"],
        "email": user_dict["email"],
        "permission_group": user_dict["permission_group"],
        "password": "changeme",
        "id_persistent": str(uuid4()),
    }
    _LOGGER.debug("Creating user with arguments: %s", str(user_args))
    edit_session_model = apps.get_model("cosmae", "editsession")
    edit_session_participant_model = apps.get_model("cosmae", "editsessionparticipant")
    email_model = apps.get_model("account", "emailaddress")
    with transaction.atomic():
        if is_admin:
            new_user = user_model.objects.create_superuser(**user_args)
        else:
            new_user = user_model.objects.create_user(**user_args)
            edit_session = edit_session_model.objects.create(
                id_persistent=uuid4(),
                id_owner_persistent=new_user.id_persistent,
                name="Default Edit Session",
            )
            participant = edit_session_participant_model.objects.create(
                edit_session=edit_session,
                type_participant="INT",
                id_participant=new_user.id_persistent,
                name_participant=new_user.username,
            )
            edit_session.editsessionparticipantset = {participant}
            email_model.objects.create(
                user_id=new_user.id,
                email=new_user.email,
                primary=True,
                verified=True,
            )
        new_user.is_active = True
        new_user.is_admin = is_admin
        new_user.save()


def connect_add_initial_users():
    "Connect signal for adding a superuser."
    connection_created.connect(
        add_initial_users, dispatch_uid="cosmae.create_initial_superuser"
    )


def connect_entity_display_txt():
    "Connect the signal for updating display txt on entity change."
    # pylint: disable=import-outside-toplevel
    from cosmae.entity.models_django import Entity
    from cosmae.entity.queue import dispatch_display_txt_queue_process

    post_save.connect(
        dispatch_display_txt_queue_process,
        sender=Entity,
        dispatch_uid="cosmae.entity_display_txt",
    )


def connect_value_display_txt():
    "Connect signal for updating display txt on value change."
    # pylint: disable=import-outside-toplevel
    from cosmae.column.queue import dispatch_display_txt_queue_process
    from cosmae.value.models_django import ValueHistory

    post_save.connect(
        dispatch_display_txt_queue_process,
        sender=ValueHistory,
        dispatch_uid="cosmae.valuehistory_display_txt_queue_process",
    )


def connect_user_created_signal():
    "Connect the signal for reading csv files on uploads."
    # pylint: disable=import-outside-toplevel
    from cosmae.management.user.queue import dispatch_create_system_user
    from cosmae.util import CosmaeUser

    user_signed_up.connect(
        dispatch_create_system_user,
        sender=CosmaeUser,
        dispatch_uid="cosmae.signed_up",
    )


def connect_password_changed_signal():
    "Connect the signal for reading csv files on uploads."
    # pylint: disable=import-outside-toplevel
    from cosmae.management.user.queue import dispatch_update_password
    from cosmae.util import CosmaeUser

    password_changed.connect(
        dispatch_update_password,
        sender=CosmaeUser,
        dispatch_uid="cosmae.password_changed",
    )


def connect_set_ssh_keys():
    "Connect signal for setting SSH keys"
    # pylint: disable=import-outside-toplevel
    from cosmae.management.user.queue import dispatch_set_ssh_keys
    from cosmae.user.ssh.models_django import SshKey

    post_save.connect(
        dispatch_set_ssh_keys,
        sender=SshKey,
        dispatch_uid="cosmae_set_ssh_key_list_save",
    )
    post_delete.connect(
        dispatch_set_ssh_keys,
        sender=SshKey,
        dispatch_uid="cosmae_set_ssh_key_list_delete",
    )
