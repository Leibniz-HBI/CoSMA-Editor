# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest

import tests.column.common as cc


@pytest.fixture
def person():
    return {
        "display_txt": "entity test",
        "names_personal": "name test",
        "justification_txt": "Entity justification for test",
    }


@pytest.fixture
def float_column(column_user, entity0):
    return {
        "value": "2.0",
        "id_column_persistent": column_user.id_persistent,
        "id_entity_persistent": entity0.id_persistent,
    }


@pytest.fixture
def child_column():
    return {"name": cc.name_column_test, "type": "FLOAT"}
