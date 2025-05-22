# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

import pytest

import tests.column.common as c


@pytest.fixture
def root_column():
    return {"name": c.name_column_test, "type": "INNER"}


@pytest.fixture
def child_column():
    return {"name": c.name_column_test, "type": "FLOAT"}
