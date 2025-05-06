"Utils for CoSMA-Editor"
from datetime import datetime, timezone

from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import models
from ninja import Schema


class EmptyResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Empty API Response"


class CosmaeUser(AbstractUser):
    # pylint: disable=too-few-public-methods
    "User Model for CoSMA-Editor"
    email = models.EmailField(unique=True)
    id_persistent = models.CharField(unique=True, max_length=36)
    tag_definitions = models.JSONField(default=list)
    social_provider = models.CharField(max_length=32, default="None")
    APPLICANT = "APLC"
    READER = "READ"
    CONTRIBUTOR = "CNTR"
    EDITOR = "EDTR"
    COMMISSIONER = "COMM"
    PERMISSION_GROUP_CHOICES = [
        (APPLICANT, "applicant"),
        (READER, "reader"),
        (CONTRIBUTOR, "contributor"),
        (EDITOR, "editor"),
        (COMMISSIONER, "commissioner"),
    ]
    permission_group = models.TextField(
        choices=PERMISSION_GROUP_CHOICES, default=APPLICANT, max_length=4
    )
    edit_session = models.ForeignKey(
        "editsession", null=True, on_delete=models.RESTRICT
    )

    class Meta:
        unique_together = [["username", "social_provider"]]

    @classmethod
    def search_username(cls, search_term: str):
        "Search for users by username"
        vector = SearchVector("username")
        query = SearchQuery(search_term)
        return (
            cls.objects.filter(is_superuser=False)
            .annotate(rank=SearchRank(vector, query))  # pylint: disable=no-member
            .order_by("-rank")[:10]
        )

    @classmethod
    def by_id_persistent_query_set(cls, id_persistent):
        "Get a user by its persistent id."
        return cls.objects.filter(id_persistent=id_persistent)

    @classmethod
    def chunk_query_set(cls, offset, count, include_superuser=False):
        """Get a chunk of users. They need to have an id large than offset.
        The maximum number of elements return is count."""
        filtered_by_id = cls.objects.filter(id__gte=offset)
        if not include_superuser:
            filtered_by_id = filtered_by_id.exclude(is_superuser=True)
        return filtered_by_id.order_by(models.F("id").asc())[:count]

    def append_column_by_id(self, id_tag_definition_persistent):
        """Adds the persistent id of a tag definition to the end of
        the list containing the persistent tag definition ids for the user"""
        tag_definitions = self.tag_definitions
        tag_definitions.append(id_tag_definition_persistent)

    def remove_column_by_id(self, id_tag_definition_persistent):
        """Removes a persistent id of a tag definition from
        the list containing the persistent tag definition ids for the user"""
        old_tag_definitions = self.tag_definitions
        new_tag_definitions = [
            id_tag_def_old
            for id_tag_def_old in old_tag_definitions
            if id_tag_def_old != id_tag_definition_persistent
        ]
        self.tag_definitions = new_tag_definitions
        self.save()

    def swap_column_idx(self, start_idx, end_idx):
        """Switches two positions in the list containing
        the persistent tag definition ids for the user"""
        tag_definitions = self.tag_definitions
        at_start = tag_definitions[start_idx]
        tag_definitions[start_idx] = tag_definitions[end_idx]
        tag_definitions[end_idx] = at_start

    def has_elevated_rights(self):
        "Method for checking if a user has elevated rights."
        return self.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}

    def set_current_edit_session(self, edit_session):
        "Set the current edit session for a user."
        self.edit_session = edit_session
        self.save()


def timestamp():
    "Create a timezone aware timestamp"
    return datetime.now(timezone.utc)
