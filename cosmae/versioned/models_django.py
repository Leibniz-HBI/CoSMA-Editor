"Abstract ORM for versioned resources"

from datetime import datetime
from typing import Optional

from django.db import models

from cosmae.edit_session.models_django import EditSession
from cosmae.exception import (
    DbObjectExistsException,
    EntityUpdatedException,
    PermissionException,
    UnmodifiableFieldException,
)


class VersionedQueryset(models.QuerySet):
    "Query set for versioned models"

    up_until_date = None

    def exclude_hidden(self):
        "Exclude items from queryset that are hidden"
        return self.filter(hidden=False)

    def exclude_disabled(self):
        "Exclude items from queryset that are disabled"
        return self.filter(disabled=False)

    def primary_only(self):
        "Exclude items from queryset that are hidden or disabled"
        return self.exclude_disabled().exclude_hidden()

    def most_recent(self):
        """Return the most recent version for all instances of a queryset."""
        # pylint: disable=no-member
        return self.filter(
            id=models.Subquery(
                self.all()
                .filter(id_persistent=models.OuterRef("id_persistent"))
                .order_by(models.F("previous_version").desc(nulls_last=True))[:1]
                .values("id")
            )
        )

    def by_id_persistent(self, id_persistent):
        """Return a query for the most recent version of a column."""
        return self.filter(id_persistent=id_persistent)  # pylint: disable=no-member

    def in_id_persistent_list(self, id_persistent_list):
        "Return a queryset containing all items with an id_persistent in the provided list."
        return self.filter(id_persistent__in=id_persistent_list)

    def up_until(self, date: datetime):
        "Only return items that are edited up until the provided datetime"
        if date is not None and (
            self.up_until_date is None or date < self.up_until_date
        ):
            self.up_until_date = date
            return self.filter(time_edit__lte=date)
        return self


class Versioned(models.Model):
    "Abstract ORM for versioned models"

    id_persistent = models.CharField(max_length=36)
    previous_version = models.ForeignKey(
        "self",
        blank=True,
        null=True,
        on_delete=models.PROTECT,
        unique=True,
        related_name="next_version+",
    )
    written_by_session = models.ForeignKey(
        "editsession", null=True, related_name="edits+", on_delete=models.PROTECT
    )
    approved_by = models.CharField(max_length=36, null=True)
    time_edit = models.DateTimeField()
    hidden = models.BooleanField(default=False)
    """Flag for not showing the object to all users.
    """
    disabled = models.BooleanField(default=False)
    """Flag for indicating soft delete.
    This is necessary to ensure that old versions are kept in the history."""

    @classmethod
    def objects_all(cls, include_disabled=False, include_hidden=False):
        "Get all objects"
        ret = cls.objects.all()  # pylint: disable=no-member
        if not include_disabled:
            ret = ret.filter(disabled=False)
        if not include_hidden:
            ret = ret.filter(hidden=False)
        return ret

    class Meta:
        "Meta class for versioned ORM"

        # pylint: disable=too-few-public-methods
        abstract = True


class HistoryMixin:
    "Mixin for History in versioned ORM models."

    def has_write_access(
        self, id_user_persistent: str
    ):  # pylint: disable=unused-argument
        "Fall back method for write access check. Always returns True."
        return True

    @classmethod
    def change_or_create_versioned(  # pylint: disable=too-many-arguments, too-many-branches, too-many-locals, too-many-positional-arguments
        cls,
        id_persistent: str,
        time_edit: datetime,
        written_by_session: EditSession,
        approved_by_id_persistent: Optional[str] = None,
        version: Optional[int] = None,
        skip_write_check: bool = False,
        **kwargs,
    ):
        """Changes a versioned model instance in the database by adding a new version.
        Note:
            The resulting object is not saved.
        Returns:
            The new object and a flag indicating wether the object changed
            from the most recent version.
        """
        if version is not None:
            most_recent = cls.most_recent_by_id(id_persistent)
            if most_recent.id != version:
                raise EntityUpdatedException(most_recent)
        else:
            by_id = cls.objects.filter(
                id_persistent=id_persistent
            )  # pylint: disable=no-member
            if by_id:
                raise DbObjectExistsException(id_persistent, kwargs)
            most_recent = None
        if most_recent is None:
            new_values = {}

        else:
            new_values = {
                field.attname: getattr(most_recent, field.attname)
                for field in cls._meta.get_fields()  # pylint: disable=protected-access, no-member
                if hasattr(field, "attname")
            }
        for field_name, value in kwargs.items():
            if field_name in cls.unmodifiable_fields and not (
                most_recent is None or value == most_recent.__dict__[field_name]
            ):
                raise UnmodifiableFieldException(field_name)
            new_values[field_name] = value
        new_values["id_persistent"] = id_persistent
        if most_recent:
            new_values.pop("id")
            new_values["previous_version_id"] = most_recent.id
        new_values["time_edit"] = time_edit
        new_values["approved_by"] = approved_by_id_persistent
        new_values["written_by_session_id"] = written_by_session.id_persistent
        new = cls(
            # special handling for relation to previous version necessary
            **new_values,
        )
        if not skip_write_check:
            for_write_check = most_recent
            if for_write_check is None:
                for_write_check = new
            can_write = for_write_check.has_write_access(
                written_by_session.id_owner_persistent
            ) or for_write_check.has_write_access(approved_by_id_persistent)
            if not can_write:
                raise PermissionException(id_persistent)
        do_write = (
            (not most_recent)
            # * The version fields are not compared as this check is intended to
            #    prevent unnecessary writes.
            # * The time_edit fields are not compared as the operation is invalid."""
            or new.hidden != most_recent.hidden
            or new.disabled != most_recent.disabled
            or most_recent.check_different_before_save(new)
        )

        if do_write:
            new.check_integrity()
            return new, do_write
        return most_recent, do_write
