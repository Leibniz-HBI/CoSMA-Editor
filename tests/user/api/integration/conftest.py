# pylint: disable=unused-argument,redefined-outer-name
"Fixtures for testing user API"
import pytest
from django.db import IntegrityError

from tests.allauth.api.integration.requests import get_config, post_login
from tests.edit_session import common as cs
from tests.user import common as cu
from cosmae.edit_session.models_django import EditSession, EditSessionParticipant
from cosmae.util import CosmaeUser


@pytest.fixture()
def user_pw_not_changed(db):
    "Fixture returning a user without changed password."
    session, _ = EditSession.objects.get_or_create(
        id_persistent=cs.id_session_user,
        id_owner_persistent=cu.test_uuid,
        name=cs.name_session_user,
    )
    try:
        user = CosmaeUser(
            username=cu.test_username,
            email=cu.test_email,
            first_name=cu.test_names_personal,
            id_persistent=cu.test_uuid,
            permission_group=CosmaeUser.CONTRIBUTOR,
            edit_session=session,
            password_changed=False,
        )
        user.set_password(cu.test_password)
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        user.save()
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(email=cu.test_email)  # pylint: disable=no-member


@pytest.fixture()
def auth_server_pw_not_changed(live_server, user_pw_not_changed, mock_mfa, mocker):
    "Live server with credential cookies for a user without changed password."
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_login(
        live_server.url,
        cu.test_username,
        cu.test_password,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    mock = mocker.MagicMock(return_value=True)
    mocker.patch("cosmae.user.api.check_mfa", mock)
    return live_server, rsp.cookies
