# pylint: disable=missing-function-docstring
"This module contains helper functions for testing the contribution API."

from cosmae.contribution import api


def get_contribution(request, id_persistent):
    return api.contribution_get(request, id_persistent=id_persistent)
