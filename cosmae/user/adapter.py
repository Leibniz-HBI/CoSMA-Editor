"Adapter for combinining social accounts with internal accounts."

from uuid import uuid4

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.db import transaction
from django.forms import ValidationError

from cosmae.edit_session.models_django import EditSession, EditSessionParticipant
from cosmae.util import CosmaeUser


class CosmaeSocialAccountAdapter(DefaultSocialAccountAdapter):
    "Adapter for combining social accounts with internal accounts."

    def new_user(self, request, sociallogin):
        social_account = sociallogin.account
        provider = social_account.provider
        username = social_account.uid
        id_persistent = str(uuid4())
        edit_session = EditSession.objects.create(
            id_persistent=str(uuid4()),
            id_owner_persistent=id_persistent,
            name="Default Edit Session",
        )
        EditSessionParticipant.objects.create(
            edit_session=edit_session,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=id_persistent,
            name_participant=username,
        )
        return CosmaeUser(
            id_persistent=id_persistent,
            social_provider=provider[:31],
            username=username,
            edit_session=edit_session,
        )

    def populate_user(self, request, sociallogin, data):
        data["username"] = sociallogin.account.uid
        return super().populate_user(request, sociallogin, data)

    def validate_disconnect(self, account, accounts) -> None:
        raise ValidationError("Can not disconnect account.")


class AccountExistsException(Exception):
    "Raised when an account already exists."


class CosmaeAccountAdapter(DefaultAccountAdapter):
    "Allauth Account adapter for setting custom fields."

    def save_user(self, request, user, form, commit=True):
        data = form.cleaned_data
        names_personal = data.get("names_personal")
        names_family = data.get("names_family")
        email = data.get("email")
        username = data.get("username")

        if names_personal:
            user.first_name = names_personal
        if names_family:
            user.last_name = names_family
        user.email = email
        user.username = username
        if "password" in data:
            user.set_password(data["password"])
        else:
            user.set_unusable_password()
        permission_group = CosmaeUser.APPLICANT
        if not (settings.DEBUG or settings.IS_UNITTEST):
            if len(CosmaeUser.objects.exclude(is_superuser=True)) == 0:
                permission_group = CosmaeUser.COMMISSIONER
        user.permission_group = permission_group
        id_user = uuid4()
        user.id_persistent = id_user

        if commit:
            with transaction.atomic():
                session = EditSession.objects.create(
                    id_persistent=str(uuid4()),
                    id_owner_persistent=str(id_user),
                    name="Default Edit Session",
                )
                session.save()
                EditSessionParticipant.objects.create(
                    edit_session=session,
                    type_participant=EditSessionParticipant.INTERNAL,
                    id_participant=id_user,
                    name_participant=username,
                )
                user.edit_session = session
                user.save()
        return user

    def send_account_already_exists_mail(self, email: str) -> None:
        "We do not wand to send mails for existing accounts"
        raise AccountExistsException()
