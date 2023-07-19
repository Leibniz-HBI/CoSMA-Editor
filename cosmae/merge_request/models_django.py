"Django models for merge requests."
from typing import Optional

from django.db import models

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.exception import ForbiddenException
from cosmae.util import CosmaeUser


class MergeRequest(models.Model):
    "Django model for a merge request."
    OPEN = "OPN"
    CLOSED = "CLS"
    MERGED = "MRG"
    STATE_CHOICES = [(OPEN, "open"), (CLOSED, "closed"), (MERGED, "merged")]
    id_destination_persistent = models.TextField()
    id_origin_persistent = models.TextField()
    created_by = models.ForeignKey(
        "CosmaeUser", related_name="created_merge_requests", on_delete=models.CASCADE
    )
    assigned_to = models.ForeignKey(
        "CosmaeUser",
        related_name="assigned_merge_requests",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField()
    id_persistent = models.UUIDField(primary_key=True)
    contribution_candidate = models.ForeignKey(
        "ContributionCandidate",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    state = models.TextField(max_length=3, choices=STATE_CHOICES, default=OPEN)

    @classmethod
    def created_by_user(cls, user: CosmaeUser):
        "Get all merge requests created by a user"
        return MergeRequest.objects.filter(created_by=user)  # pylint: disable=no-member

    @classmethod
    def assigned_to_user(cls, user: CosmaeUser):
        "Get all merge requests assigned to a user"
        return MergeRequest.objects.filter(  # pylint: disable=no-member
            assigned_to=user
        )

    @classmethod
    def by_id_persistent(cls, id_persistent: str, user: CosmaeUser):
        "Get a merge request by id_persistent"
        merge_request = cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        ).get()
        if merge_request.has_read_access(user):
            return merge_request
        raise ForbiddenException("merge request", merge_request.id_persistent)

    def has_read_access(self, user: CosmaeUser):
        "Check wether a user can read the merge request."
        return (
            # pylint:disable-next=consider-using-in
            self.created_by == user
            or self.assigned_to == user
        )

    @classmethod
    def get_tag_definitions_for_entities_request(
        cls,
        id_tag_definition_persistent: str,
        id_contribution_persistent: Optional[str],
        id_merge_request_persistent: Optional[str],
        user: CosmaeUser,
    ):
        """Get the tag definitions relevant for an entities focused tag_instance request.
        returns:
        A set of tuples. The first element is the id of the tag definition.
        The second element indicates whether this is existing data."""
        if id_contribution_persistent is None:
            if id_merge_request_persistent is None:
                return {(id_tag_definition_persistent, True)}
            merge_request = MergeRequest.by_id_persistent(
                id_merge_request_persistent, user
            )
            if merge_request.contribution_candidate:
                contribution = merge_request.contribution_candidate
            elif (
                # pylint:disable-next=consider-using-in
                merge_request.id_destination_persistent == id_tag_definition_persistent
                or merge_request.id_origin_persistent == id_tag_definition_persistent
            ):
                return {
                    (merge_request.id_destination_persistent, True),
                    (merge_request.id_origin_persistent, False),
                }
        else:
            contribution = ContributionCandidate.by_id_persistent(
                id_contribution_persistent, user
            ).get()
        merge_requests_manager = contribution.mergerequest_set
        for merge_request in merge_requests_manager.iterator():
            if (
                # pylint:disable-next=consider-using-in
                merge_request.id_origin_persistent == id_tag_definition_persistent
                or merge_request.id_destination_persistent
                == id_tag_definition_persistent
            ) and (
                # pylint:disable-next=consider-using-in
                merge_request.assigned_to == user
                or merge_request.created_by == user
            ):
                # There can't be a duplicate assignment.
                # Therefore it is safe to return early
                return {
                    (merge_request.id_destination_persistent, True),
                    (merge_request.id_origin_persistent, False),
                }
        return {(id_tag_definition_persistent, True)}
