# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

import pytest

import tests.tag.common as c


@pytest.fixture
def root_tag_def():
    return {"name": c.name_tag_def_test, "type": "INNER"}


@pytest.fixture
def child_tag_def():
    return {"name": c.name_tag_def_test, "type": "FLOAT"}


@pytest.fixture
def float_tag(tag_def, entity0):
    tag_def.save()
    entity0.save()
    return {
        "value": "2.0",
        "id_tag_definition_persistent": tag_def.id_persistent,
        "id_entity_persistent": entity0.id_persistent,
    }


@pytest.fixture
def person():
    return {
        "display_txt": "entity test",
        "names_personal": "name test",
    }
