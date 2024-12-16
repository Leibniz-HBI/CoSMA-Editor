"Adapter for combinining social accounts with internal accounts."
from uuid import uuid4

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.forms import ValidationError

from cosmae.edit_session.models_django import EditSession
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


class CosmaeAccountAdapter(DefaultAccountAdapter):
    "Allauth Account adapter for setting username"

    def populate_username(self, request, user):
        return user.username
