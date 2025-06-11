"Django ORM models"

from django.db import models


class SshKey(models.Model):
    "Links SSH keys to users."

    user = models.ForeignKey("cosmaeuser", on_delete=models.CASCADE)
    key = models.TextField()
    name = models.TextField()
    type = models.TextField()
    id_persistent = models.CharField(max_length=36)
