# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from http.cookiejar import Cookie, CookieJar

import pytest
from allauth.account import app_settings as account_settings
from allauth.core import context
from allauth.socialaccount.helpers import complete_social_login
from allauth.socialaccount.models import SocialAccount, SocialLogin, SocialToken
from allauth.socialaccount.providers.base import AuthProcess
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.contrib.messages.middleware import MessageMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.db import IntegrityError
from django.middleware.csrf import CsrfViewMiddleware
from django.test.client import RequestFactory
from django.test.utils import override_settings
from pytest_redis import factories

from tests.edit_session import common as cs
from tests.entity import common as ce
from tests.tag import common as ct
from tests.user import common as cu
from tests.utils import parse_datetime_cookie
from cosmae.edit_session.models_django import EditSession, EditSessionParticipant
from cosmae.entity.models_django import EntityHistory, EntityJustification
from cosmae.management.display_txt.util import DISPLAY_TXT_ORDER_CONFIG_KEY
from cosmae.management.models_django import ConfigValue
from cosmae.tag.models_django import (
    TagDefinition,
    TagDefinitionHistory,
    TagInstanceHistory,
)
from cosmae.util import CosmaeUser


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
        display_txt="edited_entity",
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
def tag_def(user):
    return TagDefinitionHistory.objects.create(  # pylint: disable=no-member
        id_persistent=ct.id_tag_def_persistent_test,
        name=ct.name_tag_def_test,
        time_edit=ct.time_edit_test,
        type=TagDefinition.STRING,
        owner=user,
        curated=False,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture()
def tag_def_disabled(user):
    return TagDefinitionHistory.objects.create(  # pylint: disable=no-member
        id_persistent=ct.id_tag_def_disabled_test,
        name=ct.name_tag_def_disabled_test,
        time_edit=ct.time_edit_test,
        type=TagDefinition.STRING,
        owner=user,
        curated=False,
        disabled=True,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture()
def tag_def1(user1):
    return TagDefinitionHistory.objects.create(  # pylint: disable=no-member
        id_persistent=ct.id_tag_def_persistent_test_user1,
        name=ct.name_tag_def_test1,
        time_edit=ct.time_edit_test1,
        type=TagDefinition.STRING,
        owner=user1,
        curated=False,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
    )


@pytest.fixture()
def tag_def_curated(user):
    return TagDefinitionHistory.objects.create(  # pylint: disable=no-member
        id_persistent=ct.id_tag_def_curated_test,
        name=ct.name_tag_def_curated_test,
        time_edit=ct.time_edit_curated_test,
        type=TagDefinition.STRING,
        owner=None,
        curated=True,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


def get_token(user, url):
    account = SocialAccount(provider="saml", uid=user.username)
    sociallogin = SocialLogin(user=user, account=account)
    sociallogin.state["process"] = AuthProcess.LOGIN
    sociallogin.token = SocialToken(
        app=sociallogin.account.get_provider().app, token="123", token_secret="456"
    )
    request_factory = RequestFactory()
    request = request_factory.get("/accounts/login/callback")
    session_middleware = SessionMiddleware(lambda request: None)
    session_middleware.process_request(request)
    csrf_view_middleware = CsrfViewMiddleware(lambda request: None)
    csrf_view_middleware.process_request(request)
    request.user = AnonymousUser
    MessageMiddleware(lambda request: None).process_request(request)
    with context.request_context(request):
        rsp = csrf_view_middleware.process_response(
            request,
            session_middleware.process_response(
                request, complete_social_login(request, sociallogin)
            ),
        )
    cookie_jar = CookieJar()
    for cookie_name in ["sessionid", "csrftoken"]:
        cookie = rsp.cookies[cookie_name]
        expires_str = cookie["expires"]
        expires = parse_datetime_cookie(expires_str)
        cookie_jar.set_cookie(
            Cookie(
                0,
                cookie_name,
                cookie.value,
                port=None,
                port_specified=False,
                domain="localhost.local",
                domain_specified=False,
                domain_initial_dot=False,
                path="/",
                path_specified=True,
                secure=False,
                expires=int(expires.timestamp()),
                discard=False,
                comment=None,
                comment_url=None,
                rest={"SameSite": "Lax"},
                rfc2109=False,
            )
        )
    return cookie_jar


@override_settings(
    SOCIALACCOUNT_AUTO_SIGNUP=True,
    ACCOUNT_SIGNUP_FORM_CLASS=None,
    ACCOUNT_EMAIL_VERIFICATION=account_settings.EmailVerificationMethod.NONE,  # noqa
)
@pytest.fixture
def auth_server(live_server, user_unsaved):
    cookies = get_token(user_unsaved, live_server.url)
    return live_server, cookies


@pytest.fixture()
def auth_server1(auth_server, user1_unsaved):
    live_server, cookies_user0 = auth_server
    url = live_server.url
    cookies = get_token(user1_unsaved, url)
    return live_server, cookies_user0, cookies


@pytest.fixture()
def auth_server_applicant(live_server):
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
    )
    cookies = get_token(user, live_server.url)
    return live_server, cookies


@pytest.fixture
def auth_server_commissioner(live_server, user_commissioner_unsaved):
    cookies = get_token(user_commissioner_unsaved, live_server.url)
    return live_server, cookies


@pytest.fixture()
def user_unsaved(db):  # pylint: disable=unused-argument
    session, _ = EditSession.objects.get_or_create(
        id_persistent=cs.id_session_user,
        id_owner_persistent=cu.test_uuid,
        name=cs.name_session_user,
    )
    try:
        user = CosmaeUser(
            username=cu.test_username,
            password=cu.test_password,
            email=cu.test_email,
            first_name=cu.test_names_personal,
            id_persistent=cu.test_uuid,
            permission_group=CosmaeUser.CONTRIBUTOR,
            edit_session=session,
        )
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(email=cu.test_email)  # pylint: disable=no-member


@pytest.fixture
def user(user_unsaved):
    user_unsaved.save()
    return user_unsaved


@pytest.fixture
def user1_unsaved(db):  # pylint: disable=unused-argument
    try:
        session = EditSession.objects.create(
            id_persistent=cs.id_session_user1,
            id_owner_persistent=cu.test_uuid1,
            name=cs.name_session_user1,
        )
        user = CosmaeUser(
            username=cu.test_username1,
            password=cu.test_password1,
            email=cu.test_email1,
            first_name=cu.test_names_personal1,
            id_persistent=cu.test_uuid1,
            edit_session=session,
            permission_group=CosmaeUser.CONTRIBUTOR,
        )
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(email=cu.test_email1)  # pylint: disable=no-member


@pytest.fixture()
def user1(user1_unsaved):
    user1_unsaved.save()
    return user1_unsaved


@pytest.fixture
def user_commissioner_unsaved(db):  # pylint: disable=unused-argument
    try:
        session = EditSession.objects.create(
            id_persistent=cs.id_session_commissioner,
            id_owner_persistent=cu.test_uuid_commissioner,
            name=cs.name_session_commissioner,
        )
        user = CosmaeUser(
            username=cu.test_username_commissioner,
            password=cu.test_password_commissioner,
            email=cu.test_email_commissioner,
            first_name=cu.test_names_personal_commissioner,
            id_persistent=cu.test_uuid_commissioner,
            permission_group=CosmaeUser.COMMISSIONER,
            edit_session=session,
        )
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
        return user
    except IntegrityError:
        return CosmaeUser.objects.get(
            email=cu.test_email_commissioner
        )  # pylint: disable=no-member


@pytest.fixture
def user_commissioner(user_commissioner_unsaved):
    user_commissioner_unsaved.save()
    return user_commissioner_unsaved


@pytest.fixture
def user_editor(db):  # pylint: disable=unused-argument
    try:
        session = EditSession.objects.create(
            id_persistent=cs.id_session_editor,
            id_owner_persistent=cu.test_uuid_editor,
            name=cs.name_session_editor,
        )
        user = CosmaeUser.objects.create_user(
            username=cu.test_username_editor,
            password=cu.test_password_editor,
            email=cu.test_email_editor,
            first_name=cu.test_names_personal_editor,
            id_persistent=cu.test_uuid_editor,
            permission_group=CosmaeUser.EDITOR,
            edit_session=session,
        )
        EditSessionParticipant.add(
            id_session_persistent=session.id_persistent,
            type_participant=EditSessionParticipant.INTERNAL,
            id_participant=user.id_persistent,
            name_participant=user.username,
        )
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
def tag_instances_user(user, user1):
    tag_inst = TagInstanceHistory(
        id_persistent=ct.id_instance_test0,
        time_edit=ct.time_edit_instance_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_tag_definition_persistent=ct.id_tag_def_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value",
    )
    tag_inst1 = TagInstanceHistory(
        id_persistent=ct.id_instance_test1,
        time_edit=ct.time_edit_instance_test,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
        id_tag_definition_persistent=ct.id_tag_def_persistent_test_user,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 1",
    )
    tag_inst2 = TagInstanceHistory(
        id_persistent=ct.id_instance_test2,
        time_edit=ct.time_edit_instance_test,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        id_tag_definition_persistent=ct.id_tag_def_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_0,
        value="value 2",
    )
    tag_inst3 = TagInstanceHistory(
        id_persistent=ct.id_instance_test3,
        time_edit=ct.time_edit_instance_test,
        written_by_session=user1.edit_session,
        approved_by=user1.id_persistent,
        id_tag_definition_persistent=ct.id_tag_def_persistent_test_user1,
        id_entity_persistent=ce.id_persistent_test_1,
        value="value 3",
    )
    tag_instances = [tag_inst, tag_inst1, tag_inst2, tag_inst3]
    for inst in tag_instances:
        inst.save()
    return tag_instances


redis_port = settings.RQ_QUEUES["default"]["PORT"]
redis_fixture = factories.redis_proc(port=redis_port)


@pytest.fixture(autouse=True, scope="session")
def redis(redis_fixture):
    return redis_fixture


@pytest.fixture
def display_txt_order_0(tag_def):
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def.id_persistent)


@pytest.fixture
def display_txt_order_0_1_curated(tag_def, tag_def1, tag_def_curated):
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def.id_persistent)
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def1.id_persistent)
    ConfigValue.append_to_list(
        DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def_curated.id_persistent
    )


@pytest.fixture()
def other_session(user):
    return EditSession.create(
        id_persistent=cs.id_session_user_changed,
        name=cs.name_session_user_changed,
        user=user,
    )
