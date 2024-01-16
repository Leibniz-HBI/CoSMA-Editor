"Collection of methods for attaching signals to models."
from uuid import uuid4

from django.apps import apps
from django.db.backends.signals import connection_created
from django.db.models.signals import post_save


def connect_read_csv_signal():
    "Connect the signal for reading csv files on uploads."
    # pylint: disable=import-outside-toplevel
    from cosmae.contribution.models_django import ContributionCandidate
    from cosmae.contribution.tag_definition.queue import dispatch_read_csv_head

    post_save.connect(
        dispatch_read_csv_head,
        sender=ContributionCandidate,
        dispatch_uid="cosmae.start_tag_extraction",
    )


def connect_merge_request_queue_process():
    "Connect the signal for processing merge requests."
    # pylint: disable=import-outside-toplevel
    from cosmae.merge_request.models_django import TagMergeRequest
    from cosmae.merge_request.queue import dispatch_merge_request_queue_process

    post_save.connect(
        dispatch_merge_request_queue_process,
        sender=TagMergeRequest,
        dispatch_uid="cosmae_merge_request_queue",
    )


def connect_tag_definition_queue_process():
    "Connect the signal for computing tag definition name paths."
    # pylint: disable=import-outside-toplevel
    from cosmae.tag.queue import TagDefinition, dispatch_tag_definition_queue_process

    post_save.connect(
        dispatch_tag_definition_queue_process,
        sender=TagDefinition,
        dispatch_uid="cosmae_tag_definition_queue",
    )


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
                email=email,
                username=username,
                password=password,
                id_persistent=str(uuid4()),
            )
            admin.is_active = True
            admin.is_admin = True
            admin.save()
    except Exception:  # pylint: disable=broad-except
        pass


def connect_add_superuser():
    "Connect signal for adding a superuser."
    connection_created.connect(
        add_superuser, dispatch_uid="cosmae.create_initial_superuser"
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


def connect_tag_instance_display_txt():
    "Connect signal for updating display txt on tag instance change."
    # pylint: disable=import-outside-toplevel
    from cosmae.tag.models_django import TagInstanceHistory
    from cosmae.tag.queue import dispatch_display_txt_queue_process

    post_save.connect(
        dispatch_display_txt_queue_process,
        sender=TagInstanceHistory,
        dispatch_uid="cosmae.taginstancehistory_display_txt_queue_process",
    )
