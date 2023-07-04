"Models for contributed entities"
from django.db import models


class EntityDuplicate(models.Model):
    "A model for capturing duplicate entities during import of a contribution."
    id_origin_persistent = models.TextField()
    "The id_persistent of the entity in the contribution"
    id_destination_persistent = models.TextField()
    "The id_persistent of the existing entity."
    contribution_candidate = models.ForeignKey(
        "contributioncandidate", on_delete=models.CASCADE
    )
