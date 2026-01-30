# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument

from unittest.mock import MagicMock

import pytest
from allauth.account import app_settings as account_settings
from allauth.account.models import EmailAddress
from django.conf import settings
from django.db import IntegrityError
from django.test.utils import override_settings
from pytest_redis import factories

import tests.column.common as c
import tests.value.common as cv
from cosmae.column.models_django import Column, ColumnHistory, column_objects
from cosmae.edit_session.models_django import EditSession, EditSessionParticipant
from cosmae.entity.models_django import EntityHistory
from cosmae.justification.models_django import EntityJustification
from cosmae.management.display_txt.util import DISPLAY_TXT_ORDER_CONFIG_KEY
from cosmae.management.models_django import ConfigValue
from cosmae.util import CosmaeUser
from cosmae.value.models_django import (
    ValueHistory,
)
from tests.allauth.api.integration.requests import get_config, post_login
from tests.edit_session import common as cs
from tests.entity import common as ce
from tests.user import common as cu


@pytest.fixture
def entity0(user):
    entity, _ = EntityHistory.change_or_create_versioned(
        ce.id_persistent_test_0,
        ce.time_edit_test_0,
        user.edit_session,
        display_txt=ce.display_txt_test0,
    )
    entity.save()
    return entity


@pytest.fixture()
def entity1(user1):
    entity, _ = EntityHistory.change_or_create_versioned(
        id_persistent=ce.id_persistent_test_1,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        time_edit=ce.time_edit_test_1,
        display_txt=ce.display_txt_test1,
    )
    entity.save()
    return entity


@pytest.fixture
def entity1_changed(user1, entity1):
    EntityHistory.change_or_create_versioned(
        entity1.id_persistent,
        ce.time_edit_test_1_changed,
        user1.edit_session,
        version=entity1.id,
        display_txt=ce.display_txt_test1_changed,
    )[0].save()


@pytest.fixture()
def entity2(user1):
    entity, _ = EntityHistory.change_or_create_versioned(
        ce.id_persistent_test_2,
        ce.time_edit_test_2,
        user1.edit_session,
        display_txt=ce.display_txt_test2,
    )
    entity.save()
    return entity


@pytest.fixture()
def justification0(user):
    return EntityJustification.add(
        ce.id_justification_0,
        ce.id_persistent_test_0,
        ce.justification_0,
        ce.time_justification_0,
        user,
    )[0]


@pytest.fixture()
def justification1(user1):
    return EntityJustification.add(
        ce.id_justification_1,
        ce.id_persistent_test_1,
        ce.justification_1,
        ce.time_justification_1,
        user1,
    )[0]


@pytest.fixture()
def justification2(user):
    return EntityJustification.add(
        ce.id_justification_2,
        ce.id_persistent_test_2,
        ce.justification_2,
        ce.time_justification_2,
        user,
    )[0]


@pytest.fixture()
def column(user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_persistent_test,
        name=c.name_column_test,
        time_edit=c.time_edit_test,
        type=Column.STRING,
        owner=user,
        curated=False,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture()
def column_disabled(user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_disabled_test,
        name=c.name_column_disabled_test,
        time_edit=c.time_edit_test,
        type=Column.STRING,
        owner=user,
        curated=False,
        disabled=True,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture()
def column1(user1):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_persistent_test_user1,
        name=c.name_column_test1,
        time_edit=c.time_edit_test1,
        type=Column.STRING,
        owner=user1,
        curated=False,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
    )


@pytest.fixture()
def column_curated(user):
    return ColumnHistory.objects.create(  # pylint: disable=no-member
        id_persistent=c.id_column_curated_test,
        name=c.name_column_curated_test,
        time_edit=c.time_edit_curated_test,
        type=Column.STRING,
        owner=None,
        curated=True,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture()
def mock_mfa(mocker):
    mock = MagicMock(return_value=True)
    mocker.patch("cosmae.util.auth.check_mfa", mock)


@pytest.fixture()
def mock_csrf(mocker):
    mocker.patch(
        "ninja.security.apikey.check_csrf", mocker.MagicMock(return_value=None)
    )


@pytest.fixture()
@override_settings(
    SOCIALACCOUNT_AUTO_SIGNUP=True,
    ACCOUNT_SIGNUP_FORM_CLASS=None,
    ACCOUNT_EMAIL_VERIFICATION=account_settings.EmailVerificationMethod.NONE,  # noqa
)
def auth_server_no_mfa(live_server, user, mock_csrf):
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_login(
        live_server.url,
        cu.test_username,
        cu.test_password,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    return live_server, rsp.cookies


@pytest.fixture
def auth_server(auth_server_no_mfa, mock_mfa):
    return auth_server_no_mfa


@pytest.fixture()
def auth_server_no_mfa1(auth_server_no_mfa, user1, mock_csrf):
    live_server, cookies_user0 = auth_server_no_mfa
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_login(
        live_server.url,
        cu.test_username1,
        cu.test_password1,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    return live_server, cookies_user0, rsp.cookies


@pytest.fixture
def auth_server1(auth_server_no_mfa1, mock_mfa):
    return auth_server_no_mfa1


@pytest.fixture
def user_applicant(db):
    session = EditSession.objects.create(
        id_persistent=cs.id_session_applicant,
        id_owner_persistent=cu.test_uuid_applicant,
        name=cs.name_session_applicant,
    )
    user = CosmaeUser(
        username=cu.test_username_applicant,
        email=cu.test_email_applicant,
        first_name=cu.test_names_personal_applicant,
        id_persistent=cu.test_uuid_applicant,
        edit_session=session,
        permission_group=CosmaeUser.APPLICANT,
        password_changed=True,
    )
    user.set_password(cu.test_password_applicant)
    user.save()
    return user


@pytest.fixture()
def auth_server_applicant_no_mfa(live_server, user_applicant, mock_csrf):

    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_login(
        live_server.url,
        cu.test_username_applicant,
        cu.test_password_applicant,
        cookies=cookies,
    )
    assert rsp.status_code == 200

    return live_server, rsp.cookies


@pytest.fixture
def auth_server_applicant(auth_server_applicant_no_mfa, mock_mfa):
    return auth_server_applicant_no_mfa


@pytest.fixture
def auth_server_commissioner_no_mfa(live_server, user_commissioner, mock_csrf):
    rsp = get_config(live_server.url)
    cookies = rsp.cookies
    rsp = post_login(
        live_server.url,
        cu.test_username_commissioner,
        cu.test_password_commissioner,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    return live_server, rsp.cookies


@pytest.fixture
def auth_server_commissioner(auth_server_commissioner_no_mfa, mock_mfa):
    return auth_server_commissioner_no_mfa


@pytest.fixture
def user(db):
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
            password_changed=True,
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


@pytest.fixture
def user_email_unverified(user):
    EmailAddress.objects.create(user=user, verified=False, primary=True)


@pytest.fixture
def user_email_verified(user):
    EmailAddress.objects.create(user=user, verified=True, primary=True)


@pytest.fixture()
def user1(db):
    try:
        session = EditSession.objects.create(
            id_persistent=cs.id_session_user1,
            id_owner_persistent=cu.test_uuid1,
            name=cs.name_session_user1,
        )
        user = CosmaeUser(
            username=cu.test_username1,
            email=cu.test_email1,
            first_name=cu.test_names_personal1,
            id_persistent=cu.test_uuid1,
            edit_session=session,
            permission_group=CosmaeUser.CONTRIBUTOR,
            password_changed=True,
        )
        user.set_password(cu.test_password1)
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        user.save()
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(email=cu.test_email1)  # pylint: disable=no-member


@pytest.fixture
def user_commissioner(db):
    try:
        session = EditSession.objects.create(
            id_persistent=cs.id_session_commissioner,
            id_owner_persistent=cu.test_uuid_commissioner,
            name=cs.name_session_commissioner,
        )
        user = CosmaeUser(
            username=cu.test_username_commissioner,
            email=cu.test_email_commissioner,
            first_name=cu.test_names_personal_commissioner,
            id_persistent=cu.test_uuid_commissioner,
            permission_group=CosmaeUser.COMMISSIONER,
            edit_session=session,
            password_changed=True,
        )
        user.set_password(cu.test_password_commissioner)
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        user.save()
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(
            email=cu.test_email_commissioner
        )  # pylint: disable=no-member


@pytest.fixture
def user_editor(db):  # pylint: disable=unused-argument
    try:
        session = EditSession.objects.create(
            id_persistent=cs.id_session_editor,
            id_owner_persistent=cu.test_uuid_editor,
            name=cs.name_session_editor,
        )
        user = CosmaeUser(
            username=cu.test_username_editor,
            email=cu.test_email_editor,
            first_name=cu.test_names_personal_editor,
            id_persistent=cu.test_uuid_editor,
            permission_group=CosmaeUser.EDITOR,
            edit_session=session,
            password_changed=True,
        )
        user.set_password(cu.test_password_editor)
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        user.save()
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(  # pylint: disable=no-member
            email=cu.test_email_editor
        )


@pytest.fixture
def super_user(db):  # pylint: disable=unused-argument
    session = EditSession.objects.create(
        id_persistent=cs.id_session_super,
        id_owner_persistent=cu.test_uuid_super,
        name=cs.name_session_super,
    )
    super_user = CosmaeUser.objects.create_superuser(
        email=cu.test_email_super,
        username=cu.test_username_super,
        password=cu.test_password,
        id_persistent=cu.test_uuid_super,
        edit_session=session,
    )
    return super_user


@pytest.fixture
def column_user_history(user):
    column, _ = ColumnHistory.change_or_create_versioned(  # pylint: disable=no-member
        id_persistent=c.id_column_persistent_test_user,
        time_edit=c.time_edit_test,
        written_by_session=user.edit_session,
        type=Column.FLOAT,
        id_parent_persistent=None,
        name=c.name_column_test_user,
        owner=user,
    )
    column.save()
    return column


@pytest.fixture
def column_user(column_user_history):
    return column_objects().get(id=column_user_history.id)  # pylint: disable=no-member


@pytest.fixture
def column_user1(user):
    column = ColumnHistory(  # pylint: disable=no-member
        id_persistent=c.id_column_persistent_test_user1,
        time_edit=c.time_edit_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        type=Column.FLOAT,
        id_parent_persistent=None,
        name=c.name_column_test1,
        owner=user,
    )
    column.save()
    return column


@pytest.fixture
def values_user(user, user1):
    value = ValueHistory(
        id_persistent=cv.id_instance_test0,
        time_edit=cv.time_edit_instance_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=c.id_column_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value",
    )
    value1 = ValueHistory(
        id_persistent=cv.id_instance_test1,
        time_edit=cv.time_edit_instance_test1,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=c.id_column_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1",
    )
    value2 = ValueHistory(
        id_persistent=cv.id_instance_test2,
        time_edit=cv.time_edit_instance_test,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        id_column_persistent=c.id_column_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value 2",
    )
    value3 = ValueHistory(
        id_persistent=cv.id_instance_test3,
        time_edit=cv.time_edit_instance_test1,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        id_column_persistent=c.id_column_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 3",
    )
    values = [value, value1, value2, value3]
    for inst in values:
        inst.save()
    return values


@pytest.fixture
def values_curated(user, user1):
    value = ValueHistory(
        id_persistent=cv.id_instance_test0,
        time_edit=cv.time_edit_instance_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=c.id_column_curated_test,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value",
    )
    value1 = ValueHistory(
        id_persistent=cv.id_instance_test1,
        time_edit=cv.time_edit_instance_test1,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=c.id_column_curated_test,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1",
    )
    value2 = ValueHistory(
        id_persistent=cv.id_instance_test2,
        time_edit=cv.time_edit_instance_test,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        id_column_persistent=c.id_column_curated_test,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value 2",
    )
    value3 = ValueHistory(
        id_persistent=cv.id_instance_test3,
        time_edit=cv.time_edit_instance_test1,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        id_column_persistent=c.id_column_curated_test,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 3",
    )
    values = [value, value1, value2, value3]
    for inst in values:
        inst.save()
    return values


@pytest.fixture
def values_entity1_changed(user):
    value = ValueHistory(
        id_persistent=cv.id_instance_test1,
        time_edit=cv.time_edit_instance_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=c.id_column_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1",
    )
    value.save()
    value_changed = ValueHistory(
        id_persistent=cv.id_instance_test1,
        time_edit=ce.time_edit_test_1_changed,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_column_persistent=c.id_column_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1 changed",
        previous_version=value,
    )
    value_changed.save()
    values = [value, value_changed]
    return values


redis_port = settings.RQ_QUEUES["default"]["PORT"]
redis_fixture = factories.redis_proc(port=redis_port)


@pytest.fixture(autouse=True, scope="session")
def redis(redis_fixture):
    return redis_fixture


@pytest.fixture(autouse=True, scope="session")
def delete_errors():
    yield
    contributions_pth = settings.CONTRIBUTION_DIRECTORY
    for pth in contributions_pth.glob("*"):
        if pth.name != ".gitignore":
            pth.unlink()


@pytest.fixture
def display_txt_order_0(column):
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, column.id_persistent)


@pytest.fixture
def display_txt_order_0_1_curated(column, column1, column_curated):
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, column.id_persistent)
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, column1.id_persistent)
    ConfigValue.append_to_list(
        DISPLAY_TXT_ORDER_CONFIG_KEY, column_curated.id_persistent
    )


@pytest.fixture()
def other_session(user):
    return EditSession.create(
        id_persistent=cs.id_session_user_changed,
        name=cs.name_session_user_changed,
        user=user,
    )


@pytest.fixture()
def request_no_user(mocker):
    mock = mocker.MagicMock()
    mock.user = None
    mock.session = {}
    return mock


@pytest.fixture()
def request_user(user, mocker):
    mock = mocker.MagicMock()
    mock.user = user
    mock.session = {"account_authentication_methods": [{"type": "totp"}]}
    return mock


@pytest.fixture()
def request_user1(user1, mocker):
    mock = mocker.MagicMock()
    mock.user = user1
    mock.session = {"account_authentication_methods": [{"type": "totp"}]}
    return mock


@pytest.fixture()
def request_applicant(user_applicant, mocker):
    mock = mocker.MagicMock()
    mock.user = user_applicant
    mock.session = {"account_authentication_methods": [{"type": "totp"}]}
    return mock


@pytest.fixture()
def request_commissioner(user_commissioner, mocker):
    mock = mocker.MagicMock()
    mock.user = user_commissioner
    mock.session = {"account_authentication_methods": [{"type": "totp"}]}
    return mock
