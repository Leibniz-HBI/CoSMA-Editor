"Collection of methods for attaching signals to models."

from logging import getLogger

from allauth.account.signals import password_changed, user_signed_up
from django.apps import apps
from django.conf import settings
from django.db.models.signals import post_delete, post_migrate, post_save

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


def add_initial_users(sender, **kwargs):  # pylint: disable=unused-argument
    "Add superuser if no users exist"
    user_model = apps.get_model("cosmae", "cosmaeuser")
    _LOGGER.debug("Checking for existing users.")
    if user_model.objects.count() == 0 and not settings.IS_UNITTEST:
        from cosmae.management.user.queue import (  # pylint: disable=import-outside-toplevel
            dispatch_initial_user,
        )

        dispatch_initial_user()


def connect_add_initial_users(app_config):
    "Connect signal for adding a superuser."
    post_migrate.connect(
        add_initial_users,
        dispatch_uid="cosmae.create_initial_superuser",
        sender=app_config,
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


def connect_data_publication_signal():
    "Connect signal for data publication steps."
    # pylint: disable=import-outside-toplevel
    from cosmae.management.data_publication.models_django import DataPublication
    from cosmae.management.data_publication.queue.utils import (
        data_publication_signal_handler,
    )

    post_save.connect(
        data_publication_signal_handler,
        sender=DataPublication,
        dispatch_uid="cosmae_data_publication_signal_handler",
    )
