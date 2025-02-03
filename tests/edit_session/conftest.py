# pylint: disable=missing-module-docstring,missing-function-docstring,no-member,redefined-outer-name,unused-argument

import pytest

import tests.edit_session.common as c
from cosmae.edit_session.models_django import EditSessionParticipant


@pytest.fixture()
def session_participant_commissioner(user, user_commissioner):
    return EditSessionParticipant.add(
        id_session_persistent=c.id_session_user,
        type_participant=EditSessionParticipant.INTERNAL,
        id_participant=user_commissioner.id_persistent,
        name_participant=user_commissioner.username,
    )


@pytest.fixture()
def other_session_participant_commissioner(user, user_commissioner):
    return EditSessionParticipant.add(
        id_session_persistent=c.id_session_user_changed,
        type_participant=EditSessionParticipant.INTERNAL,
        id_participant=user_commissioner.id_persistent,
        name_participant=user_commissioner.username,
    )


@pytest.fixture()
def get_orcid_token_mock(mocker):
    token_rsp_mock = mocker.MagicMock()
    token_rsp_mock.status_code = 200
    token_rsp_mock.json = mocker.MagicMock(
        return_value={"access_token": c.access_token}
    )
    post_mock = mocker.MagicMock(return_value=token_rsp_mock)
    post_mock.return_value = token_rsp_mock
    mocker.patch("cosmae.edit_session.orcid.post", post_mock)
    return post_mock


@pytest.fixture()
def get_orcid_person_mock(mocker):
    person_rsp_mock = mocker.MagicMock()
    person_rsp_mock = mocker.Mock()
    person_rsp_mock.status_code = 200
    person_rsp_mock.json = mocker.Mock(
        return_value={"name": {"credit-name": {"value": c.name_orcid}}}
    )
    get_mock = mocker.MagicMock(return_value=person_rsp_mock)
    mocker.patch("cosmae.edit_session.orcid.get", get_mock)
    return get_mock
