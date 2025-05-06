# pylint: disable=missing-module-docstring,missing-function-docstring,no-member,redefined-outer-name
import pytest

import tests.edit_session.common as cs
import tests.user.common as c
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.edit_session.models_django import EditSession


@pytest.fixture
def tag_def_user_profile(user):
    return ColumnHistory.objects.create(
        name=c.name_tag_def,
        id_persistent=c.id_tag_def_persistent,
        time_edit=c.time_edit_tag_def,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def tag_def_user_profile1(user):
    return ColumnHistory.objects.create(
        name=c.name_tag_def1,
        id_persistent=c.id_tag_def_persistent1,
        time_edit=c.time_edit_tag_def1,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def tag_def_user_profile2(user):
    return ColumnHistory.objects.create(
        name=c.name_tag_def2,
        id_persistent=c.id_tag_def_persistent2,
        time_edit=c.time_edit_tag_def2,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def tag_def_user_profile3(user):
    return ColumnHistory.objects.create(
        name=c.name_tag_def3,
        id_persistent=c.id_tag_def_persistent3,
        time_edit=c.time_edit_tag_def3,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def user_with_tag_defs(
    user,
    tag_def_user_profile,
    tag_def_user_profile1,
    tag_def_user_profile2,
    tag_def_user_profile3,
):
    user.tag_definitions = [
        tag_def.id_persistent
        for tag_def in [
            tag_def_user_profile,
            tag_def_user_profile1,
            tag_def_user_profile2,
            tag_def_user_profile3,
        ]
    ]
    user.save()
    return user


@pytest.fixture()
def other_session(user):
    return EditSession.create(
        id_persistent=cs.id_session_user_changed,
        name=cs.name_session_user_changed,
        user=user,
    )
