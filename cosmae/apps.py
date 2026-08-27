"""Django app configuration for CoSMA-Editor"""

import logging
from typing import List

from django.apps import AppConfig, apps
from django.conf import settings
from django.core.exceptions import AppRegistryNotReady
from django.db.models.signals import post_migrate

from cosmae.signals import (
    connect_add_initial_users,
    connect_column_queue_process,
    connect_compute_conflicts_signals,
    connect_data_publication_signal,
    connect_entity_display_txt,
    connect_password_changed_signal,
    connect_read_csv_signal,
    connect_set_ssh_keys,
    connect_user_created_signal,
    connect_value_display_txt,
)

logger = logging.getLogger("cosmae.app_config")


added_permissions = {
    "CosmaeGroup.APPLICANT": [],
    "CosmaeGroup.READER": [],
    "CosmaeGroup.CONTRIBUTOR": [],
    "CosmaeGroup.EDITOR": [],
    "CosmaeGroup.COMMISSIONER": [],
}


def add_permission_for_group(group: str, permission_list_list: List[List[str]]):
    "Method for granting permissions to groups."
    group_model = apps.get_model("auth", "Group")
    permission_model = apps.get_model("auth", "group_permissions")
    group_name = str(group)

    group, _created_group = group_model.objects.get_or_create(name=group_name)
    for permission_list in permission_list_list:
        for permission_name in permission_list:
            permission = permission_model.objects.filter(codename=permission_name).get()
            if not permission in group.permissions:
                group.permissions.add(permission)
    group.save()


def add_permissions(
    app_config: AppConfig, verbosity=2, **kwargs
):  # pylint: disable=unused-argument
    "Create all new groups and permissions."
    logger.setLevel(10 * (4 - verbosity))
    logger.info("Create CoSMA-E groups.")
    permission_model = apps.get_model("auth", "Permission")
    for group, permissions in added_permissions.items():
        try:
            add_permission_for_group(group, permissions)
        except permission_model.DoesNotExist:
            logger.warning("Permissions do not exist yet.")
            return


def delete_marked_contributions():
    "Delete contributions marked for deletion."
    contributions_model = apps.get_model("cosmae", "ContributionCandidate")
    contributions = contributions_model.objects.filter(mark_delete=True)
    # pylint: disable=import-outside-toplevel
    from cosmae.contribution.queue import enqueue_delete_contributions

    for contribution in contributions:
        enqueue_delete_contributions(str(contribution.id_persistent))


class CosmaeConfig(AppConfig):
    """Configuration for the CoSMA-Editor Django app"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "cosmae"

    def ready(self) -> None:
        post_migrate.connect(add_permissions, dispatch_uid="cosmae.create_groups")
        try:
            if not settings.IS_UNITTEST:
                connect_add_initial_users(self)
                connect_read_csv_signal()
                connect_compute_conflicts_signals()
                connect_column_queue_process()
                connect_data_publication_signal()
                connect_entity_display_txt()
                connect_value_display_txt()
                connect_user_created_signal()
                connect_password_changed_signal()
                connect_set_ssh_keys()
                delete_marked_contributions()
        except AppRegistryNotReady:
            pass
        super().ready()
