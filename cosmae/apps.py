"""Django app configuration for CoSMA-Editor"""
import logging
from typing import List

from django.apps import AppConfig, apps
from django.core.exceptions import AppRegistryNotReady
from django.db.backends.signals import connection_created
from django.db.models.signals import post_migrate, post_save

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


def add_superuser(
    sender, connection, verbosity=2, **kwargs
):  # pylint: disable=unused-argument
    "Add superuser if no users exist"
    try:
        user_model = apps.get_model("cosmae", "cosmaeuser")
        if user_model.objects.count() == 0:
            username = "admin"
            email = "mail@test.url"
            password = "changeme"
            print(f"Creating account for {username} ({email})")
            admin = user_model.objects.create_superuser(
                email=email, username=username, password=password
            )
            admin.is_active = True
            admin.is_admin = True
            admin.save()
    except Exception:  # pylint: disable=broad-except
        pass


class CosmaeConfig(AppConfig):
    """Configuration for the CoSMA-Editor Django app"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "cosmae"

    def ready(self) -> None:
        post_migrate.connect(add_permissions, dispatch_uid="cosmae.create_groups")
        connection_created.connect(
            add_superuser, dispatch_uid="cosmae.create_initial_superuser"
        )
        try:
            # pylint: disable=import-outside-toplevel
            from cosmae.contribution.models_django import ContributionCandidate
            from cosmae.contribution.tag_definition.queue import dispatch_read_csv_head

            post_save.connect(
                dispatch_read_csv_head,
                sender=ContributionCandidate,
                dispatch_uid="cosmae.start_tag_extraction",
            )
            from cosmae.merge_request.models_django import MergeRequest
            from cosmae.merge_request.queue import dispatch_merge_request_queue_process

            post_save.connect(
                dispatch_merge_request_queue_process,
                sender=MergeRequest,
                dispatch_uid="cosmae_merge_request_queue",
            )
        except AppRegistryNotReady:
            pass
        super().ready()
