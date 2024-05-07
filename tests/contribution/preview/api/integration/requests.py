# pylint: disable=missing-module-docstring,missing-function-docstring
import requests


def get_preview(
    url,
    id_contribution_persistent,
    id_column_persistent,
    cookies=None,
):
    return requests.get(
        url
        + f"/cosmae/api/contributions/{id_contribution_persistent}/preview/{id_column_persistent}",
        cookies=cookies,
        timeout=900,
    )
