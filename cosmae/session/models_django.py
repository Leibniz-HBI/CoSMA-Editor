"Custom sessions"

from django.contrib.sessions.backends.cached_db import (
    SessionStore as CachedDbSessionStore,
)
from django.contrib.sessions.models import Session
from django.db import models

TFA_SESSION_KEY = "two_factor_verified"


class CosmaeSession(Session):
    "A custom session class."

    two_factor_verified = models.BooleanField(default=False)
    "Stores whether two factor authentication was successfully established."

    class Meta:
        "Meta class for sessions to not use default table."

        app_label = "cosmae"
        db_table = "cosmae_session"


class SessionStore(CachedDbSessionStore):
    "Custom session store that sets custom session."

    @classmethod
    def get_model_class(cls):
        return CosmaeSession

    def create_model_instance(self, data):
        "Set initial values for session."
        spr = super().create_model_instance(data)
        try:
            two_factor_verified = data.get(TFA_SESSION_KEY, False)
        except (ValueError, TypeError):
            two_factor_verified = False
        spr.two_factor_verified = two_factor_verified
        return spr
