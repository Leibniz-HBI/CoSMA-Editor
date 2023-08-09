# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.merge_request.api.integration.requests as req
import tests.merge_request.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import ConflictResolution as ConflictResolutionDb


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.merge_request.api.check_user", mock):
        rsp = req.post_resolution(
            server.url,
            c.id_persistent_merge_request,
            "",
            0,
            "",
            0,
            "",
            0,
            "",
            0,
            "",
            0,
            True,
            cookies=cookies,
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.post_resolution(
        server.url,
        c.id_persistent_merge_request,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        True,
    )
    assert rsp.status_code == 401


def test_no_mr(auth_server):
    server, cookies = auth_server
    rsp = req.post_resolution(
        server.url,
        "4e679630-241e-40f8-b175-c4b7916be379",
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        "",
        0,
        True,
        cookies=cookies,
    )
    assert rsp.status_code == 404


def test_creates_resolution(
    auth_server,
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    server, cookies = auth_server
    rsp = req.post_resolution(
        server.url,
        str(merge_request_user.id_persistent),
        id_entity_persistent=entity1.id_persistent,
        id_entity_version=entity1.id,
        id_tag_definition_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_tag_definition_origin_version=origin_tag_def_for_mr.id,
        id_tag_definition_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_tag_definition_destination_version=destination_tag_def_for_mr.id,
        id_tag_instance_origin_persistent=instances_merge_request_origin_user[
            1
        ].id_persistent,
        id_tag_instance_origin_version=instances_merge_request_origin_user[1].id,
        id_tag_instance_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_tag_instance_destination_version=instance_merge_request_destination_user_conflict.id,
        replace=True,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    resolution = ConflictResolutionDb.objects.all().get()  # pylint: disable=no-member
    assert str(resolution.merge_request_id) == merge_request_user.id_persistent
    assert resolution.entity_id == entity1.id
    assert resolution.tag_definition_origin_id == origin_tag_def_for_mr.id
    assert resolution.tag_definition_destination_id == destination_tag_def_for_mr.id
    assert (
        resolution.tag_instance_origin_id == instances_merge_request_origin_user[1].id
    )
    assert (
        resolution.tag_instance_destination_id
        == instance_merge_request_destination_user_conflict.id
    )
    assert resolution.replace


def test_overwrites_resolution(
    auth_server,
    merge_request_user,
    origin_tag_def_for_mr,
    destination_tag_def_for_mr,
    entity1,
    instances_merge_request_origin_user,
    instance_merge_request_destination_user_conflict,
):
    server, cookies = auth_server
    rsp = req.post_resolution(
        server.url,
        str(merge_request_user.id_persistent),
        id_entity_persistent=entity1.id_persistent,
        id_entity_version=entity1.id,
        id_tag_definition_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_tag_definition_origin_version=origin_tag_def_for_mr.id,
        id_tag_definition_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_tag_definition_destination_version=destination_tag_def_for_mr.id,
        id_tag_instance_origin_persistent=instances_merge_request_origin_user[
            1
        ].id_persistent,
        id_tag_instance_origin_version=instances_merge_request_origin_user[1].id,
        id_tag_instance_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_tag_instance_destination_version=instance_merge_request_destination_user_conflict.id,
        replace=True,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.post_resolution(
        server.url,
        str(merge_request_user.id_persistent),
        id_entity_persistent=entity1.id_persistent,
        id_entity_version=entity1.id,
        id_tag_definition_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_tag_definition_origin_version=origin_tag_def_for_mr.id,
        id_tag_definition_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_tag_definition_destination_version=destination_tag_def_for_mr.id,
        id_tag_instance_origin_persistent=instances_merge_request_origin_user[
            1
        ].id_persistent,
        id_tag_instance_origin_version=instances_merge_request_origin_user[1].id,
        id_tag_instance_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_tag_instance_destination_version=instance_merge_request_destination_user_conflict.id,
        replace=False,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    resolution = ConflictResolutionDb.objects.all().get()  # pylint: disable=no-member
    assert str(resolution.merge_request_id) == merge_request_user.id_persistent
    assert resolution.entity_id == entity1.id
    assert resolution.tag_definition_origin_id == origin_tag_def_for_mr.id
    assert resolution.tag_definition_destination_id == destination_tag_def_for_mr.id
    assert (
        resolution.tag_instance_origin_id == instances_merge_request_origin_user[1].id
    )
    assert (
        resolution.tag_instance_destination_id
        == instance_merge_request_destination_user_conflict.id
    )
    assert not resolution.replace
