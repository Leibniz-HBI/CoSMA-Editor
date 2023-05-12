# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest
from django.db import IntegrityError

from tests.entity import common as ce
from tests.user import common as cu
from tests.user.api.integration.requests import post_login, post_register
from cosmae.entity.models_django import Entity
from cosmae.util import CosmaeUser


@pytest.fixture
def entity0():
    return Entity(id_persistent=ce.id_persistent_test_0, time_edit=ce.time_edit_test_0)


@pytest.fixture
def auth_server(live_server):
    rsp = post_register(
        live_server.url,
        {
            "user_name": cu.test_username,
            "password": cu.test_password,
            "email": cu.test_email,
            "names_personal": cu.test_names_personal,
        },
    )
    rsp = post_login(
        live_server.url, {"name": cu.test_username, "password": cu.test_password}
    )
    return live_server, rsp.cookies


@pytest.fixture()
def auth_server1(auth_server):
    live_server, cookies_user0 = auth_server
    url = live_server.url
    rsp = post_register(
        url,
        {
            "user_name": cu.test_username1,
            "password": cu.test_password1,
            "email": cu.test_email1,
            "names_personal": cu.test_names_personal1,
        },
    )
    rsp = post_login(url, {"name": cu.test_username1, "password": cu.test_password1})
    return live_server, cookies_user0, rsp.cookies


@pytest.fixture
def user(db):  # pylint: disable=unused-argument
    try:
        user = CosmaeUser.objects.create_user(
            username=cu.test_username,
            password=cu.test_password,
            email=cu.test_email,
            first_name=cu.test_names_personal,
        )
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(email=cu.test_email)  # pylint: disable=no-member


@pytest.fixture
def user1(db):  # pylint: disable=unused-argument
    try:
        user = CosmaeUser.objects.create_user(
            username=cu.test_username1,
            password=cu.test_password1,
            email=cu.test_email1,
            first_name=cu.test_names_personal1,
        )
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(email=cu.test_email1)  # pylint: disable=no-member
