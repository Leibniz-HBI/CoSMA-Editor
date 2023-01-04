"Pytest fixtures for all tag tests."
from datetime import timedelta

import pytest

from tests.tag import common as c
from cosmae.tag.models_django import TagDefinition


@pytest.fixture()
def tag_def():
    "Shared tag defintion for tests."
    return TagDefinition(
        id_persistent=c.id_tag_def_persistent_test,
        type=TagDefinition.FLOAT,
        id_parent_persistent=None,
        name=c.name_tag_def_test,
        time_edit=c.time_edit_test,
    )


@pytest.fixture
def tag_def_child_0():
    "A shared child tag definition for tests"
    return TagDefinition(
        id_persistent=c.id_tag_def_persistent_child_0,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 0",
        time_edit=c.time_edit_test + timedelta(seconds=10),
    )


@pytest.fixture
def tag_def_child_1():
    "Aanother shared child tag definition for tests"
    return TagDefinition(
        id_persistent=c.id_tag_def_persistent_child_1,
        type=TagDefinition.FLOAT,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name="test tag definition child 1",
        time_edit=c.time_edit_test + timedelta(seconds=10),
    )
