# pylint: disable=missing-function-docstring
"This module contains helper functions for testing the contribution column API."

from cosmae.contribution.column import api


def get_column(request, id_persistent):
    return api.get_columns(request, id_contribution_persistent=id_persistent)


def patch_column(
    request,
    id_contribution_persistent,
    id_column_persistent,
    id_existing_persistent=None,
    discard=None,
):
    return api.patch_column(
        request,
        id_contribution_persistent=id_contribution_persistent,
        id_persistent=id_column_persistent,
        patch_data=api.ColumnPatchRequest(
            id_existing_persistent=id_existing_persistent, discard=discard
        ),
    )
