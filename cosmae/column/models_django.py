"Django ORM models for columns"

from __future__ import annotations

from typing import Optional, Type, TypeVar

from django.db import models

from cosmae.exception import (
    ColumnExistsException,
    DisabledColumnHasChildrenException,
    ForbiddenException,
    InvalidValueException,
    NoChildColumnAllowedException,
    NoParentColumnException,
    NoSelfParentColumnException,
)
from cosmae.util import CosmaeUser
from cosmae.versioned.models_django import HistoryMixin, Versioned

_T = TypeVar("_T")


class ColumnAbstract(Versioned):
    "Abstract Django ORM model for columns."

    BOOL = "BOL"
    INNER = "INR"
    FLOAT = "FLT"
    STRING = "STR"
    TYPE_CHOICES = [
        (INNER, "inner"),
        (BOOL, "bool"),
        (FLOAT, "float"),
        (STRING, "string"),
    ]
    name = models.TextField()
    description = models.TextField(blank=True, null=True)
    id_parent_persistent = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES, default=INNER)
    time_edit = models.DateTimeField()
    owner = models.ForeignKey(
        "CosmaeUser", null=True, blank=True, on_delete=models.SET_NULL
    )
    curated = models.BooleanField(default=False)

    class Meta:
        "Meta class for abstract column django model"

        # pylint: disable=too-few-public-methods
        abstract = True

    def is_owner(self, user_id_persistent: str):
        "Check wether a user owns the column."
        return (  # pylint: disable=no-member
            self.owner is None
            and CosmaeUser.objects.filter(id_persistent=user_id_persistent)
            .get()
            .permission_group
            in {CosmaeUser.COMMISSIONER, CosmaeUser.EDITOR}
        ) or (
            self.owner is not None
            and str(self.owner.id_persistent) == user_id_persistent
        )

    def has_write_access(self, user_id_persistent: str):
        "Check wether a user can write to the column."
        return self.is_owner(user_id_persistent)

    @classmethod
    def descendants(cls, id_column_ancestor_persistent, user: CosmaeUser):
        "Get all descendants of a column that can contain data."
        ancestors = []
        queue = [id_column_ancestor_persistent]
        while len(queue) > 0:
            id_column_parent_persistent = queue.pop(0)
            ids_with_type = cls.objects.filter(
                models.Q(curated=True) | models.Q(owner_id=user.id),
                id_parent_persistent=id_column_parent_persistent,
                disabled=False,
                hidden=False,
            ).values("id_persistent", "type", "curated", "owner_id")
            for obj in ids_with_type:
                if obj["type"] == cls.INNER:
                    queue.append(obj["id_persistent"])
                else:
                    ancestors.append(obj["id_persistent"])
        return ancestors


class Column(ColumnAbstract):
    "Django ORM model for column."

    class Meta:
        "Meta class for column view to ensure django does not create a table."

        # pylint: disable=too-few-public-methods
        managed = False

    @classmethod
    def query_set(cls, manager=None, include_hidden=False):
        "Get a query set containing all most recent columns."
        if manager is None:
            manager = cls.objects.all()  # pylint: disable=no-member
        if include_hidden:
            return manager
        return manager.filter(hidden=False)

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a column."""
        return cls.most_recent_by_id_query_set(id_persistent).get()

    @classmethod
    def most_recent_by_id_query_set(cls, id_persistent):
        """Return a query for the most recent version of a column."""
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )

    @classmethod
    def children_query_set(
        cls, id_persistent: Optional[str], user: Optional[CosmaeUser] = None
    ):
        "Get the most recent versions of child columns."
        children = cls.objects.filter(  # pylint: disable=no-member
            id_parent_persistent=id_persistent, disabled=False
        )
        if user is None:
            return children.filter(hidden=False)
        return children.filter(models.Q(hidden=False) | models.Q(owner=user))

    def _get_history_entry(self):
        # pylint: disable=no-member
        return ColumnHistory.objects.filter(id=self.id).get()

    def set_curated(self, requester: CosmaeUser, time_edit):
        "Set curated state for a column."
        return self._get_history_entry().set_curated(requester, time_edit)

    def set_owner(self, user: CosmaeUser, requester: CosmaeUser, time_edit):
        "Set owner for a column."
        return self._get_history_entry().set_owner(user, requester, time_edit)

    def check_value(self, val: str):
        "Check if a value is of the type for this column."
        if self.type == Column.INNER:
            raise InvalidValueException(self.id_persistent, None, self.type)
        if self.type == Column.BOOL and not (
            (isinstance(val, str) and val.lower() in {"true", "false"})
        ):
            raise InvalidValueException(self.id_persistent, val, self.type)
        if self.type == Column.STRING and val is None:
            raise InvalidValueException(self.id_persistent, val, self.type)
        if self.type == Column.FLOAT:
            try:
                _ = float(val)
            except ValueError as exc:
                raise InvalidValueException(self.id_persistent, val, self.type) from exc
        return val

    @classmethod
    def for_user(
        cls: Type[_T],
        user: CosmaeUser,
        include_curated: bool = False,
        include_disabled: bool = False,
    ) -> models.Manager[_T]:
        "Get all columns for a user."
        if include_curated:
            if not user.permission_group in [
                CosmaeUser.EDITOR,
                CosmaeUser.COMMISSIONER,
            ]:
                raise ForbiddenException("Column", "")
            return cls.objects.filter(  # pylint: disable=no-member
                (models.Q(curated=True) | models.Q(owner=user))
                & models.Q(disabled=include_disabled)
            )
        return cls.objects.filter(  # pylint: disable=no-member
            owner=user, disabled=include_disabled
        )

    @classmethod
    def curated_query_set(cls):
        "Get most recent curated column"
        return cls.objects.filter(curated=True)  # pylint: disable=no-member


class ColumnHistory(ColumnAbstract, HistoryMixin):
    "Django ORM model for columns history."

    unmodifiable_fields = {"id_persistent", "type"}

    @classmethod
    def most_recent_query_set(
        cls, manager=None, include_hidden=False, include_disabled=False
    ):
        "Get a query set containing all most recent columns."
        if manager is None:
            manager = cls.objects  # pylint: disable=no-member
        most_recent = manager.annotate(
            id_most_recent=models.Subquery(
                cls.objects.filter(  # pylint: disable=no-member
                    id_persistent=models.OuterRef("id_persistent")
                )
                .order_by(models.F("previous_version").desc(nulls_last=True))
                .values("id")[:1]
            )
        ).filter(id=models.F("id_most_recent"))
        if not include_hidden:
            most_recent = most_recent.filter(hidden=False)
        if not include_disabled:
            most_recent.filter(disabled=False)
        return most_recent

    @classmethod
    def most_recent_by_id_query_set(cls, id_persistent):
        """Return a query for the most recent version of a column."""
        return cls.most_recent_query_set().filter(  # pylint: disable=no-member
            id_persistent=id_persistent
        )

    @classmethod
    def most_recent_by_id(cls, id_persistent):
        """Return the most recent version of a column."""
        return cls.most_recent_by_id_query_set(id_persistent).get()

    @classmethod
    def bypass_parent(cls, id_parent_persistent):
        """Bypasses a parent in history.
        This is necessary when removing column
        to make sure there are no holes in the history."""
        children = cls.objects.filter(
            id_parent_persistent=id_parent_persistent
        ).annotate(
            id_parent_parent_persistent=models.functions.Coalesce(
                models.Subquery(
                    cls.objects.filter(
                        id_persistent=id_parent_persistent,
                        time_edit__lt=models.OuterRef("time_edit"),
                    )
                    .order_by("-time_edit")
                    .values("id_parent_persistent")[:0]
                ),
                None,
            )
        )
        for child in children:
            child.id_parent_persistent = child.id_parent_parent_persistent
            child.save()

    def set_curated(self, requester: CosmaeUser, time_edit):
        "Set curated state for a column."
        return ColumnHistory.change_or_create_versioned(
            self.id_persistent,
            time_edit,
            requester.edit_session,
            requester.id_persistent,
            version=self.id,  # pylint: disable=no-member
            name=self.name,
            id_parent_persistent=self.id_parent_persistent,
            owner_id=None,
            curated=True,
            skip_write_check=True,
        )

    def set_owner(self, user: CosmaeUser, requester: CosmaeUser, time_edit):
        "Set curated state for a column."
        return ColumnHistory.change_or_create_versioned(
            self.id_persistent,
            time_edit,
            written_by_session=requester.edit_session,
            owner_id=user.id,
            name=self.name,
            id_parent_persistent=self.id_parent_persistent,
            version=self.id,  # pylint: disable=no-member
            curated=False,
        )

    def check_integrity(self):  # pylint: disable=too-many-arguments
        """Check wether new version keeps constraints."""
        column_parent = None
        if self.id_parent_persistent is not None:
            if self.id_parent_persistent == self.id_persistent:
                raise NoSelfParentColumnException()
            try:
                column_parent = Column.most_recent_by_id(self.id_parent_persistent)
            except Column.DoesNotExist as exc:  # pylint: disable=no-member
                raise NoParentColumnException(self.id_parent_persistent) from exc
        if column_parent is not None and column_parent.type != self.INNER:
            raise NoChildColumnAllowedException(self.id_parent_persistent)
        exists = (
            Column.objects.filter(  # pylint: disable=no-member
                name=self.name, id_parent_persistent=self.id_parent_persistent
            )
            # annotate successor in history
            .annotate(
                next_version=models.Subquery(
                    Column.objects.filter(  # pylint: disable=no-member
                        previous_version=models.OuterRef("id")
                    ).values("id")
                )
            )
            # exclude when same id_persistent and no successor present
            .exclude(id_persistent=self.id_persistent, next_version__isnull=True)
        )
        if exists:
            raise ColumnExistsException(
                self.name,
                exists.order_by(models.F("previous_version").desc(nulls_last=True))[
                    0
                ].id_persistent,
                self.id_parent_persistent,
            )
        if self.disabled and self.most_recent_query_set().filter(
            id_parent_persistent=self.id_persistent
        ):
            raise DisabledColumnHasChildrenException()

    def check_different_before_save(self, other):
        """Checks structural equality for two columns."""
        return (
            other.name != self.name
            or other.id_parent_persistent != self.id_parent_persistent
            or other.type != self.type
            or other.owner != self.owner
            or other.curated != self.curated
            or other.description != self.description
            or other.disabled != self.disabled
        )


class OwnershipRequest(models.Model):
    "Django ORM Model for ownership change requests."

    id_persistent = models.UUIDField(unique=True)
    id_column_persistent = models.TextField()
    receiver = models.ForeignKey(
        "CosmaeUser", blank=True, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    petitioner = models.ForeignKey(
        "CosmaeUser", blank=True, null=True, on_delete=models.CASCADE, related_name="+"
    )

    @classmethod
    def by_id_column_persistent(cls, id_column_persistent: str):
        "Get an ownership request by column"
        cls.by_id_column_persistent_query_set(id_column_persistent).get()

    @classmethod
    def by_id_column_persistent_query_set(cls, id_column_persistent):
        "Get an ownership request by column as a query set."
        return cls.objects.filter(  # pylint: disable = no-member
            id_column_persistent=id_column_persistent
        )

    @classmethod
    def by_id_persistent(cls, id_ownership_request_persistent):
        "Get an Ownership request by its persistent id."
        return cls.objects.filter(  # pylint: disable=no-member
            id_persistent=id_ownership_request_persistent
        ).get()

    @classmethod
    def _annotate_columns(cls, manager):
        column_sub_query = (
            Column.objects.filter(  # pylint: disable=no-member
                id_persistent=models.OuterRef("id_column_persistent")
            )
            .order_by(models.F("previous_version").desc(nulls_last=True))[:1]
            .values(
                column=models.functions.JSONObject(
                    id="id",
                    name="name",
                    id_persistent="id_persistent",
                    id_parent_persistent="id_parent_persistent",
                    description="description",
                    time_edit="time_edit",
                    type="type",
                    previous_version="previous_version",
                    owner=models.functions.JSONObject(
                        username="owner__username",
                        id_persistent="owner__id_persistent",
                        permission_group="owner__permission_group",
                        id="owner__id",
                    ),
                    curated="curated",
                    hidden="hidden",
                    disabled="disabled",
                )
            )
        )
        return manager.annotate(column=column_sub_query)

    @classmethod
    def received_by_user_query_set(cls, user: CosmaeUser):
        "Get the ownership requests received by a user."
        return cls._annotate_columns(
            cls.objects.filter(receiver=user)  # pylint: disable=no-member
        )

    @classmethod
    def petitioned_by_user_query_set(cls, user: CosmaeUser):
        """Get the ownership requests petitioned by a user.
        If the user is a commissioner or an editor,
        curated columns will also be included."""
        petitioned_self = cls._annotate_columns(
            cls.objects.filter(petitioner=user)  # pylint: disable=no-member
        )
        if user.permission_group in {CosmaeUser.EDITOR, CosmaeUser.COMMISSIONER}:
            petitioned_curated = cls._annotate_columns(
                cls.objects.all()  # pylint: disable=no-member
            ).filter(
                column__isnull=False,
                # JSONObject will make this an int.
                column__curated=True,
            )
            return petitioned_self.union(petitioned_curated)
        return petitioned_self
