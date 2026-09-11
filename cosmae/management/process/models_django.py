"Models for keeping track of processes."

from django.db import models


class ProcessRun(models.Model):
    """Model for keeping track of process runs."""

    id_persistent = models.CharField(max_length=36, primary_key=True, editable=False)
    """Persistent ID for the process run."""

    process_name = models.CharField(max_length=255)
    """Name of the process run."""

    started_at = models.DateTimeField(auto_now_add=True)
    """Timestamp when the process run started."""
