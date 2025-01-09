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
