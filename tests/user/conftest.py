# pylint: disable=missing-module-docstring,missing-function-docstring,no-member,redefined-outer-name
import pytest

import tests.edit_session.common as cs
import tests.user.common as c
from cosmae.column.models_django import Column, ColumnHistory
from cosmae.edit_session.models_django import EditSession


@pytest.fixture
def column_user_profile(user):
    return ColumnHistory.objects.create(
        name=c.name_column,
        id_persistent=c.id_column_persistent,
        time_edit=c.time_edit_column,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def column_user_profile1(user):
    return ColumnHistory.objects.create(
        name=c.name_column1,
        id_persistent=c.id_column_persistent1,
        time_edit=c.time_edit_column1,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def column_user_profile2(user):
    return ColumnHistory.objects.create(
        name=c.name_column2,
        id_persistent=c.id_column_persistent2,
        time_edit=c.time_edit_column2,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def column_user_profile3(user):
    return ColumnHistory.objects.create(
        name=c.name_column3,
        id_persistent=c.id_column_persistent3,
        time_edit=c.time_edit_column3,
        type=Column.STRING,
        written_by_session=user.edit_session,
        approved_by=user.id_persistent,
    )


@pytest.fixture
def user_with_columns(
    user,
    column_user_profile,
    column_user_profile1,
    column_user_profile2,
    column_user_profile3,
):
    user.columns = [
        column.id_persistent
        for column in [
            column_user_profile,
            column_user_profile1,
            column_user_profile2,
            column_user_profile3,
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
