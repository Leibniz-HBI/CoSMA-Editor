"Django ORM models for handling edit sessions"
from django.db import models
from django.db.utils import IntegrityError


class EditSession(models.Model):
    "Django ORM model for edit sessions"

    id_persistent = models.CharField(max_length=36, primary_key=True)
    id_owner_persistent = models.CharField(max_length=36)
    name = models.TextField()

    @classmethod
    def owned_by_user(cls, user):
        "Get all edit sessions owned by a user"
        return cls.objects.filter(id_owner_persistent=user.id_persistent).annotate(
            type_participant=models.Value(
                EditSessionParticipant.INTERNAL,
                output_field=models.CharField(max_length=3),
            )
        )

    @classmethod
    def user_participates(cls, user):
        "Get all edit sessions where a user participates."
        return cls.objects.annotate(
            type_participant=models.Subquery(
                EditSessionParticipant.objects.filter(
                    type_participant=EditSessionParticipant.INTERNAL,
                    id_participant=user.id_persistent,
                    edit_session_id=models.OuterRef("id_persistent"),
                ).values("type_participant")
            )
        ).filter(
            ~models.Q(id_owner_persistent=user.id_persistent),
            type_participant__isnull=False,
        )

    @classmethod
    def create(cls, id_persistent, name, user):
        "Create a new edit session and add the owner as user"
        session = cls.objects.create(
            id_persistent=id_persistent,
            id_owner_persistent=user.id_persistent,
            name=name,
        )
        participant = EditSessionParticipant.objects.create(
            edit_session=session,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        session.editsessionparticipantset = {participant}
        return session


class EditSessionParticipant(models.Model):
    "Django ORM model for edit session participants"
    edit_session = models.ForeignKey(EditSession, on_delete=models.CASCADE)
    INTERNAL = "INT"
    ORCID = "ORC"
    type_participant = models.CharField(
        max_length=3, choices=[(INTERNAL, "internal"), (ORCID, "ORCID")]
    )
    id_participant = models.CharField(max_length=36)
    name_participant = models.TextField()

    class Meta:
        "Meta model for edit session participants."
        constraints = [
            models.UniqueConstraint(
                fields=["edit_session", "id_participant"],
                name="Unique Edit Session Membership",
            )
        ]

    @classmethod
    def add(
        cls,
        id_session_persistent,
        type_participant,
        id_participant,
        name_participant,
    ):
        "Add a participant to an edit session"
        try:
            return cls.objects.create(
                edit_session_id=id_session_persistent,
                type_participant=type_participant,
                id_participant=id_participant,
                name_participant=name_participant,
            )
        except IntegrityError as exc:
            # Return membership already exists
            try:
                return cls.objects.filter(
                    edit_session_id=id_session_persistent, id_participant=id_participant
                ).get()
            except Exception:  # pylint: disable=broad-except
                raise exc from exc
