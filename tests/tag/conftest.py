"Pytest fixtures for all tag tests."
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
