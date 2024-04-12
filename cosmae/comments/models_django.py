"Django ORM models for comments"
from datetime import datetime
from typing import List

from django.db import models

from cosmae.util import CosmaeUser


class Comment(models.Model):
    "Models a comment for resources used throughout the app."
    content = models.TextField()
    relates_to = models.UUIDField()
    author = models.ForeignKey(
        "cosmae.CosmaeUser", null=True, blank=True, on_delete=models.SET_NULL
    )
    timestamp = models.DateTimeField()

    @classmethod
    def add_comment(
        cls, relates_to: str, content: str, author: CosmaeUser, timestamp: datetime
    ):
        "Add a new comment"
        return cls.objects.create(  # pylint: disable=no-member
            relates_to=relates_to,
            content=content,
            author=author,
            timestamp=timestamp,
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
