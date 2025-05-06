# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import requests


def get_merge_requests(url, cookies=None):
    return requests.get(url + "/cosmae/api/merge_requests", cookies=cookies, timeout=900)


def get_conflicts(url, id_merge_request_persistent, cookies=None):
    return requests.get(
        url + f"/cosmae/api/merge_requests/{id_merge_request_persistent}/conflicts",
        cookies=cookies,
        timeout=900,
    )


def post_resolution(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    url,
    id_merge_request_persistent,
    id_entity_persistent,
    id_entity_version,
    id_column_origin_persistent,
    id_column_origin_version,
    id_column_destination_persistent,
    id_column_destination_version,
    id_value_origin_persistent,
    id_value_origin_version,
    id_value_destination_persistent,
    id_value_destination_version,
    replacement_state=None,
    replacement_value=None,
    cookies=None,
):
    return requests.post(
        url + f"/cosmae/api/merge_requests/{id_merge_request_persistent}/resolve",
        json={
            "id_entity_version": id_entity_version,
            "id_column_origin_version": id_column_origin_version,
            "id_column_destination_version": id_column_destination_version,
            "id_value_origin_version": id_value_origin_version,
            "id_value_destination_version": id_value_destination_version,
            "id_entity_persistent": id_entity_persistent,
            "id_column_origin_persistent": id_column_origin_persistent,
            "id_column_destination_persistent": id_column_destination_persistent,
            "id_value_origin_persistent": id_value_origin_persistent,
            "id_value_destination_persistent": id_value_destination_persistent,
            "replacement_state": replacement_state,
            "replacement_value": replacement_value,
        },
        cookies=cookies,
        timeout=900,
    )


def post_start_merge(url, id_merge_request_persistent, cookies=None):
    return requests.post(
        url + f"/cosmae/api/merge_requests/{id_merge_request_persistent}/merge",
        cookies=cookies,
        timeout=900,
    )


def patch_merge_request(url, id_merge_request_persistent, patch_dict, cookies=None):
    return requests.patch(
        url + f"/cosmae/api/merge_requests/{id_merge_request_persistent}",
        json=patch_dict,
        cookies=cookies,
        timeout=900,
    )
