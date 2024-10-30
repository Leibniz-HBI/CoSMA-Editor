# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,too-many-arguments,too-many-positional-arguments
from urllib.parse import urljoin

import requests


def post_tag_def(url, tag_def, cookies=None):
    return post_tag_defs(url, [tag_def], cookies)


def post_tag_defs(url, tag_defs, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/tags/definitions"),
        json={"tag_definitions": tag_defs},
        cookies=cookies,
        timeout=900,
    )


def get_tagdefs(url, cookies=None):
    return requests.get(
        urljoin(url, "/cosmae/api/tags/definitions"),
        cookies=cookies,
        timeout=900,
    )


def post_tag_instance(url, tag, **kwargs):
    return post_tag_instances(url, [tag], **kwargs)


def post_tag_instances(url, tags, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/tags"),
        json={"tag_instances": tags},
        cookies=cookies,
        timeout=900,
    )


def post_tag_instance_chunks(url, tag_def_id, offset, limit, cookies=None):
    return requests.post(
        urljoin(url, "/cosmae/api/tags/chunk"),
        json={
            "id_tag_definition_persistent": tag_def_id,
            "offset": offset,
            "limit": limit,
        },
        cookies=cookies,
        timeout=900,
    )


def post_tag_def_children(url, id_persistent, cookies=None):
    return requests.post(
        urljoin(url, "cosmae/api/tags/definitions/children"),
        json={"id_parent_persistent": id_persistent},
        timeout=900,
        cookies=cookies,
    )


def post_tag_instance_values(
    url, id_entity_persistent, id_tag_definition_persistent, cookies=None
):
    return post_tag_instances_values(
        url, [(id_entity_persistent, id_tag_definition_persistent)], cookies
    )


def post_tag_instances_values(url, id_persistent_pairs, cookies):
    return requests.post(
        urljoin(url, "cosmae/api/tags/values"),
        json={
            "value_requests": [
                {
                    "id_entity_persistent": id_entity_persistent,
                    "id_tag_definition_persistent": id_tag_definition_persistent,
                }
                for id_entity_persistent, id_tag_definition_persistent in id_persistent_pairs
            ]
        },
        cookies=cookies,
        timeout=900,
    )


def post_tag_instances_for_entities(
    url,
    id_entity_persistent_list,
    id_tag_definition_persistent_list,
    id_contribution_persistent=None,
    id_merge_request_persistent=None,
    cookies=None,
):
    return requests.post(
        urljoin(url, "cosmae/api/tags/entities"),
        json={
            "id_tag_definition_persistent_list": id_tag_definition_persistent_list,
            "id_entity_persistent_list": id_entity_persistent_list,
            "id_contribution_persistent": id_contribution_persistent,
            "id_merge_request_persistent": id_merge_request_persistent,
        },
        cookies=cookies,
        timeout=900,
    )


def post_curation(url, id_tag_definition_persistent, cookies=None):
    return requests.post(
        url
        + f"/cosmae/api/tags/definitions/permissions/{id_tag_definition_persistent}/curate",
        cookies=cookies,
        timeout=900,
    )


def post_owner(url, id_tag_definition_persistent, id_user_persistent, cookies=None):
    return requests.post(
        url + "/cosmae/api/tags/definitions/permissions/"
        f"{id_tag_definition_persistent}/owner/{id_user_persistent}",
        cookies=cookies,
        timeout=900,
    )


def post_accept(url, id_request_persistent, cookies=None):
    return requests.post(
        url + "/cosmae/api/tags/definitions/permissions/owner/"
        f"{id_request_persistent}/accept",
        cookies=cookies,
        timeout=900,
    )


def get_ownership_requests(url, cookies=None):
    return requests.get(
        url + "/cosmae/api/tags/definitions/permissions/ownership_requests",
        cookies=cookies,
        timeout=900,
    )


def delete_ownership(url, id_request_persistent, cookies=None):
    return requests.delete(
        url + "/cosmae/api/tags/definitions/permissions/owner/"
        f"{id_request_persistent}",
        cookies=cookies,
        timeout=900,
    )


def post_details(url, id_persistent_list, cookies=None):
    return requests.post(
        url + "/cosmae/api/tags/definitions/details",
        json={"id_persistent_list": id_persistent_list},
        cookies=cookies,
        timeout=900,
    )


def purge_tag(url, id_tag_definition_persistent, cookies=None):
    return requests.delete(
        url + f"/cosmae/api/tags/definitions/{id_tag_definition_persistent}",
        cookies=cookies,
        timeout=900,
    )
