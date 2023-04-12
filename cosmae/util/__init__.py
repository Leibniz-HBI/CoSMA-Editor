"Utils for CoSMA-Editor"
from django.contrib.auth.models import AbstractUser
from django.db import models
from ninja import Schema


class EmptyResponse(Schema):
    # pylint: disable=too-few-public-methods
    "Empty API Response"


class CosmaeUser(AbstractUser):
    # pylint: disable=too-few-public-methods
    "User Model for CoSMA-E"
    email = models.EmailField(unique=True)