# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest

from cosmae.management.display_txt.api import DISPLAY_TXT_ORDER_CONFIG_KEY
from cosmae.management.models_django import ConfigValue


@pytest.fixture
def display_txt_order_0(tag_def):
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def.id_persistent)


@pytest.fixture
def display_txt_order_0_1_curated(tag_def, tag_def1, tag_def_curated):
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def.id_persistent)
    ConfigValue.append_to_list(DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def1.id_persistent)
    ConfigValue.append_to_list(
        DISPLAY_TXT_ORDER_CONFIG_KEY, tag_def_curated.id_persistent
    )
