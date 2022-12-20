# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest

from tests.entity import common as ce
from cosmae.entity.models_django import Entity


@pytest.fixture
def entity0():
    return Entity(id_persistent=ce.id_persistent_test_0, time_edit=ce.time_edit_test_0)
