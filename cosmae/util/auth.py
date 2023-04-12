"Utils for authentication"
from enum import Enum

from django.http import HttpRequest
from ninja.security import django_auth


class CosmaePermission(Enum):
    # pylint: disable=too-few-public-methods
    "Permissions for CoSMA-E"
    READ_DATA = "READ_DATA"
    UPLOAD_DATA = "UPLOAD_DATA"
    ASSIGN_CONTRIBUTOR = "ASSIGN_CONTRIBUTOR"
    REVIEW_DATA = "REVIEW_DATA"
    ASSIGN_GROUP = "ASSIGN_GROUP"


class CosmaeGroup(Enum):
    # pylint: disable=too-few-public-methods
    "Groups for CoSMA-E"
    APPLICANT = "APPLICANT"
    READER = "READER"
    CONTRIBUTOR = "CONTRIBUTOR"
    CONTRIUBUTOR_SUPERVISOR = "CONTRIBUTOR_SUPERVISOR"
    EDITOR = "EDITOR"
    COMMISSIONER = "COMMISSIONER"


def cosmae_auth(request: HttpRequest):
    """Workaround for cookie authentication.
    This is required to have sub paths without authorization
    where the parents use authorization."""
    return django_auth.authenticate(request, None)
