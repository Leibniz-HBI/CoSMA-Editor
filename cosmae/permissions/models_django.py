"Database models for permissions"

from django.db import models

from cosmae.column.models_django import Column


class Permission(models.Model):
    "Django ORM model for permissions"

    id_resource_persistent = models.CharField(max_length=36)
    user = models.ForeignKey("CosmaeUser", on_delete=models.CASCADE, related_name="+")
    read = models.BooleanField(default=False)
    write = models.BooleanField(default=False)

    @classmethod
    def is_owner(cls, id_resource_persistent, user):
        """Check whether a resource is owned by a user.
        This currently only works for columns.
        In the future the owner property should also be handled by permission objects.
        This would require to create an initial permission for newly created columns.
        """
        column = Column.objects.filter(id_persistent=id_resource_persistent).get()
        return column.owner_id == user.id
