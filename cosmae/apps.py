"""Django app configuration for CoSMA-Editor"""
import logging
from typing import List

from django.apps import AppConfig, apps
from django.db.models.signals import post_migrate

logger = logging.getLogger("cosmae.app_config")

READ_PERMISSIONS = [
    "view_person",
    "view_entity",
    "view_taginstance",
    "view_tagdefinition",
]

WRITE_PERMISSIONS = [
    "add_person",
    "add_entity",
    "add_taginstance",
    "add_tagdefinition",
]

added_permissions = {
    "CosmaeGroup.APPLICANT": [],
    "CosmaeGroup.READER": [READ_PERMISSIONS],
    "CosmaeGroup.CONTRIBUTOR": [READ_PERMISSIONS],
    "CosmaeGroup.EDITOR": [READ_PERMISSIONS, WRITE_PERMISSIONS],
    "CosmaeGroup.COMMISSIONER": [READ_PERMISSIONS, WRITE_PERMISSIONS],
}


def add_permission_for_group(group: str, permission_list_list: List[List[str]]):
    "Method for granting permissions to groups."
    group_model = apps.get_model("auth", "Group")
    permission_model = apps.get_model("auth", "Permission")
    group_name = str(group)

    group, _created_group = group_model.objects.get_or_create(name=group_name)
    for permission_list in permission_list_list:
        for permission_name in permission_list:
            permission = permission_model.objects.get(codename=permission_name)
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


class CosmaeConfig(AppConfig):
    """Configuration for the CoSMA-E Django app"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "cosmae"

    def ready(self) -> None:
        post_migrate.connect(add_permissions, dispatch_uid="cosmae.create_groups")
        super().ready()