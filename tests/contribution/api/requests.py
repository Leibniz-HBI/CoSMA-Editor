# pylint: disable=missing-function-docstring
"This module contains helper functions for testing the contribution API."

from django.core.files.uploadedfile import UploadedFile

from cosmae.contribution import api


def get_contribution(request, id_persistent):
    return api.contribution_get(request, id_persistent=id_persistent)


def post_contribution(request, contribution, content_type="text/csv"):
    return api.contribution_post(
        request,
        contribution,
        UploadedFile(
            name="empty.csv",
            file=open("tests/files/empty.csv", "rb"),
            content_type=content_type,
        ),
    )


def get_chunk(request, offset, limit):
    return api.contribution_chunk_get(request, start=offset, offset=limit)


def patch_contribution(request, id_persistent, patch_data):
    return api.contribution_patch(
        request,
        id_persistent=id_persistent,
        patch_data=patch_data,
    )


def post_column_assignment_complete(request, id_persistent):
    return api.post_complete_assignment(request, id_persistent)
