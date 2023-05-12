"ORM models for tags of contribution candidates."
from django.db import models

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.util import CosmaeUser


class TagDefinitionContribution(models.Model):
    "ORM Model for newly added contribution tag definitions"
    INNER = "INR"
    FLOAT = "FLT"
    STRING = "STR"
    EXISTING = "XST"
    TYPE_CHOICES = [
        (INNER, "inner"),
        (FLOAT, "float"),
        (STRING, "string"),
    ]
    name = models.TextField()
    id_persistent = models.UUIDField()
    id_existing_persistent = models.TextField(default=None, blank=True, null=True)
    id_parent_persistent = models.TextField(null=True, blank=True)
    type = models.CharField(
        max_length=3, choices=TYPE_CHOICES, default=None, null=True, blank=True
    )
    contribution_candidate = models.ForeignKey(
        ContributionCandidate, on_delete=models.CASCADE
    )
    index_in_file = models.IntegerField()
    discard = models.BooleanField(default=False)

    @classmethod
    def get_by_candidate(cls, candidate: ContributionCandidate):
        "Get the tag definitions for a specific contribution candidate"
        return list(
            TagDefinitionContribution.objects.filter(  # pylint: disable=no-member
                contribution_candidate=candidate,
            )
        )

    @classmethod
    def get_by_id_persistent(cls, id_persistent: str, user: CosmaeUser):
        "Get a tag contribution tag definition by id_persistent and user"
        return TagDefinitionContribution.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent, contribution_candidate__created_by=user
        ).get()


class TagInstanceContribution(models.Model):
    "ORM model for tag instances of contributions candidates."
    value = models.TextField()
    id_entity_persistent = models.TextField(null=True, blank=True)
    tag_definition = models.ForeignKey(
        TagDefinitionContribution, on_delete=models.CASCADE
    )
    line_idx = models.IntegerField()
    discard = models.BooleanField(default=True)
