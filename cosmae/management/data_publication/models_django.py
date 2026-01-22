"Django ORM models for dataset publications"

from datetime import datetime
from uuid import uuid4

from django.db import models


class DataPublication(models.Model):
    "Model representing a data publication."

    class Step(models.TextChoices):
        # pylint: disable=too-many-ancestors
        "Steps in the data publication author credit calculation."

        CREATED = "CREA", "Created"
        JUSTIFICATION = "JUST", "Justification"
        DISPLAY_TXT = "DSPL", "DisplayText"
        CURATED = "CURA", "Curated"
        USER = "USER", "User"
        AUTHORS = "AUTH", "Authors"
        PROCESSING_COMPLETED = "CMPL", "Completed"

    id_persistent = models.CharField(max_length=36, unique=True, primary_key=True)
    name = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    step = models.TextField(max_length=4, choices=Step, default=Step.CREATED)
    error_message = models.TextField(null=True, blank=True)
    error_details = models.TextField(null=True, blank=True)
    is_working = models.BooleanField(default=False)

    @property
    def is_error(self):
        "Check if the publication is in an error state."
        return self.error_message is not None

    @classmethod
    def create(cls, name: str, start_time: datetime, end_time: datetime):
        "Create a new dataset publication instance."
        publication = DataPublication(
            name=name,
            start_time=start_time,
            end_time=end_time,
            id_persistent=str(uuid4()),
            step=cls.Step.CREATED,
        )
        publication.save()
        return publication


class DataPublicationStepInput(models.Model):
    "Model representing results of each step in the data publication process."

    class Meta:
        unique_together = [["publication", "step"]]

    publication = models.ForeignKey(
        DataPublication, on_delete=models.CASCADE, related_name="results"
    )
    step = models.TextField(max_length=4, choices=DataPublication.Step)
    input = models.JSONField()
