"Models for contribution proposals."
from django.db import models, transaction
from django.db.utils import OperationalError

from cosmae.exception import ResourceLockedException
from cosmae.util import CosmaeUser
from cosmae.util.django import patch_from_dict


class ContributionCandidate(models.Model):
    "ORM Model for maintaining proposed contributions."
    UPLOADED = "UPLD"
    COLUMNS_EXTRACTED = "CLXT"
    COLUMNS_ASSIGNED = "CLAS"
    ENTITIES_MATCHED = "NTMT"
    ENTITIES_ASSIGNED = "NTAS"
    VALUES_ASSIGNED = "VLAS"
    MERGED = "MRGD"
    TYPE_CHOICES = [
        (UPLOADED, "uploaded"),
        (COLUMNS_EXTRACTED, "columns extracted"),
        (COLUMNS_ASSIGNED, "columns assigned"),
        (ENTITIES_MATCHED, "entities matched"),
        (ENTITIES_ASSIGNED, "entities assigned"),
        (VALUES_ASSIGNED, "values assigned"),
        (MERGED, "merged"),
    ]

    name = models.TextField()
    description = models.TextField()
    id_persistent = models.UUIDField(primary_key=True)
    anonymous = models.BooleanField()
    has_header = models.BooleanField()
    created_by = models.ForeignKey("CosmaeUser", on_delete=models.CASCADE)
    file_name = models.TextField()
    state = models.CharField(max_length=4, choices=TYPE_CHOICES)

    @classmethod
    def chunk_for_user(cls, user, start, offset):
        "Get the contribution candidates for a specific user."
        return ContributionCandidate.objects.filter(  # pylint: disable=no-member
            created_by=user
        ).all()[start : start + offset]

    @classmethod
    def by_id_persistent(cls, id_persistent: str, user: CosmaeUser):
        "Get a single contribution candidate"
        return ContributionCandidate.objects.filter(  # pylint: disable=no-member
            created_by=user, id_persistent=id_persistent
        )

    @classmethod
    def update(cls, id_persistent: str, user: CosmaeUser, **kwargs):
        "Changes a contribution candidate."
        try:
            with transaction.atomic():
                candidate_query = ContributionCandidate.by_id_persistent(
                    id_persistent, user
                )
                candidate = candidate_query.select_for_update(nowait=True).get()
                patch_from_dict(candidate, **kwargs)
            return candidate
        except OperationalError as exc:
            if str(exc.args[0]).startswith("database is locked"):
                raise ResourceLockedException() from exc
            raise exc
