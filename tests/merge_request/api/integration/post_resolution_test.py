# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-positional-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.merge_request.api.integration.requests as req
import tests.merge_request.common as c
from cosmae.exception import NotAuthenticatedException
from cosmae.merge_request.models_django import (
    TagConflictResolution as ConflictResolutionDb,
)


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
            "REPLACE",
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
        "REPLACE",
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
        "REPLACE",
        cookies=cookies,
    )
    assert rsp.status_code == 404


def test_allow_value_resolution_without_value(
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
        id_column_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_column_origin_version=origin_tag_def_for_mr.id,
        id_column_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_column_destination_version=destination_tag_def_for_mr.id,
        id_value_origin_persistent=instances_merge_request_origin_user[1].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[1].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="VALUE",
        cookies=cookies,
    )
    assert rsp.status_code == 200


def test_creates_resolution_replace(
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
        id_column_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_column_origin_version=origin_tag_def_for_mr.id,
        id_column_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_column_destination_version=destination_tag_def_for_mr.id,
        id_value_origin_persistent=instances_merge_request_origin_user[1].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[1].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="REPLACE",
        cookies=cookies,
    )
    assert rsp.status_code == 200
    resolution = ConflictResolutionDb.objects.all().get()  # pylint: disable=no-member
    assert str(resolution.merge_request_id) == merge_request_user.id_persistent
    assert resolution.entity_id == entity1.id
    assert resolution.column_origin_id == origin_tag_def_for_mr.id
    assert resolution.column_destination_id == destination_tag_def_for_mr.id
    assert resolution.value_origin_id == instances_merge_request_origin_user[1].id
    assert (
        resolution.value_destination_id
        == instance_merge_request_destination_user_conflict.id
    )
    assert resolution.replacement_state == ConflictResolutionDb.REPLACE
    assert resolution.replacement_value is None


def test_creates_resolution_replacement_value(
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
        id_column_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_column_origin_version=origin_tag_def_for_mr.id,
        id_column_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_column_destination_version=destination_tag_def_for_mr.id,
        id_value_origin_persistent=instances_merge_request_origin_user[1].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[1].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="VALUE",
        replacement_value=c.replacement_value,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    resolution = ConflictResolutionDb.objects.all().get()  # pylint: disable=no-member
    assert str(resolution.merge_request_id) == merge_request_user.id_persistent
    assert resolution.entity_id == entity1.id
    assert resolution.column_origin_id == origin_tag_def_for_mr.id
    assert resolution.column_destination_id == destination_tag_def_for_mr.id
    assert resolution.value_origin_id == instances_merge_request_origin_user[1].id
    assert (
        resolution.value_destination_id
        == instance_merge_request_destination_user_conflict.id
    )
    assert resolution.replacement_state == ConflictResolutionDb.VALUE
    assert resolution.replacement_value == c.replacement_value


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
        id_column_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_column_origin_version=origin_tag_def_for_mr.id,
        id_column_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_column_destination_version=destination_tag_def_for_mr.id,
        id_value_origin_persistent=instances_merge_request_origin_user[1].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[1].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="REPLACE",
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.post_resolution(
        server.url,
        str(merge_request_user.id_persistent),
        id_entity_persistent=entity1.id_persistent,
        id_entity_version=entity1.id,
        id_column_origin_persistent=origin_tag_def_for_mr.id_persistent,
        id_column_origin_version=origin_tag_def_for_mr.id,
        id_column_destination_persistent=destination_tag_def_for_mr.id_persistent,
        id_column_destination_version=destination_tag_def_for_mr.id,
        id_value_origin_persistent=instances_merge_request_origin_user[1].id_persistent,
        id_value_origin_version=instances_merge_request_origin_user[1].id,
        id_value_destination_persistent=(
            instance_merge_request_destination_user_conflict.id_persistent
        ),
        id_value_destination_version=instance_merge_request_destination_user_conflict.id,
        replacement_state="KEEP",
        cookies=cookies,
    )
    assert rsp.status_code == 200
    resolution = ConflictResolutionDb.objects.all().get()  # pylint: disable=no-member
    assert str(resolution.merge_request_id) == merge_request_user.id_persistent
    assert resolution.entity_id == entity1.id
    assert resolution.column_origin_id == origin_tag_def_for_mr.id
    assert resolution.column_destination_id == destination_tag_def_for_mr.id
    assert resolution.value_origin_id == instances_merge_request_origin_user[1].id
    assert (
        resolution.value_destination_id
        == instance_merge_request_destination_user_conflict.id
    )
    assert resolution.replacement_state == ConflictResolutionDb.KEEP
