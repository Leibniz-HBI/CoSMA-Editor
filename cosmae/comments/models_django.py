"Django ORM models for comments"
from typing import List

from django.db import models


class Comment(models.Model):
    "Models a comment for resources used throughout the app."
    content = models.TextField()
    relates_to = models.UUIDField()

    @classmethod
    def add_comment(cls, relates_to: str, content: str):
        "Add a new comment"
        cls.objects.create(  # pylint: disable=no-member
            relates_to=relates_to,
            content=content,
        )

    @classmethod
    def for_resources(cls, resource_id_persistent_list: List[str]):
        "Get comments for resources, providing their minimum offset"
        return {
            id_persistent: cls.objects.filter(  # pylint: disable=no-member
                relates_to=id_persistent
            ).order_by("id")
            for id_persistent in resource_id_persistent_list
        }
