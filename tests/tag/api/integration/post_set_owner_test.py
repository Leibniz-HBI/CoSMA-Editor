# pylint: disable=missing-module-docstring,redefined-outer-name,invalid-name,unused-argument,too-many-locals,too-many-arguments,too-many-statements
from unittest.mock import MagicMock, patch

import tests.tag.api.integration.requests as req
import tests.tag.common as c
import tests.user.common as cu
from cosmae.column.models_django import Column as ColumnDb
from cosmae.column.models_django import OwnershipRequest as OwnershipRequestDb
from cosmae.exception import NotAuthenticatedException


def test_unknown_user(auth_server):
    "Test the response when the user is not authenticated."
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.column.api_permissions.check_user", mock):
        rsp = req.post_owner(
            server.url, c.id_column_persistent_test, cu.test_uuid, cookies=cookies
        )
    assert rsp.status_code == 401


def test_no_cookies(auth_server):
    "Check 401 response for missing cookies."
    server, _ = auth_server
    rsp = req.post_owner(server.url, c.id_column_persistent_test, cu.test_uuid)
    assert rsp.status_code == 401


def test_insufficient_permissions(auth_server, tag_def_curated):
    "Check correct status code for normal users for a curated tag definition."
    server, cookies = auth_server
    rsp = req.post_owner(
        server.url, tag_def_curated.id_persistent, cu.test_uuid1, cookies=cookies
    )
    assert rsp.status_code == 403


def test_set_owner_non_curated(auth_server, tag_def_user, user1):
    "Check correct status code for normal users for a curated tag definition."
    server, cookies = auth_server
    rsp = req.post_owner(
        server.url, tag_def_user.id_persistent, user1.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    ownership_request_list = list(
        OwnershipRequestDb.objects.filter(  # pylint: disable=no-member
            id_column_persistent=tag_def_user.id_persistent
        )
    )
    assert len(ownership_request_list) == 1
    ownership_request = ownership_request_list[0]
    assert ownership_request.petitioner == tag_def_user.owner
    assert ownership_request.receiver == user1


def test_replaces_existing_request(auth_server, tag_def_user, user1, user_commissioner):
    "Test whether an existing ownership request ist replaced."
    server, cookies = auth_server
    rsp = req.post_owner(
        server.url,
        tag_def_user.id_persistent,
        user_commissioner.id_persistent,
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.post_owner(
        server.url, tag_def_user.id_persistent, user1.id_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    ownership_request_list = list(
        OwnershipRequestDb.objects.filter(  # pylint: disable=no-member
            id_column_persistent=tag_def_user.id_persistent
        )
    )
    assert len(ownership_request_list) == 1
    ownership_request = ownership_request_list[0]
    assert ownership_request.petitioner == tag_def_user.owner
    assert ownership_request.receiver == user1


def test_curated_commissioner(auth_server_commissioner, user, tag_def_curated):
    "Test wether a commissioner can make an ownership request for a curated tag definition."
    server, cookies = auth_server_commissioner
    rsp = req.post_owner(
        server.url, tag_def_curated.id_persistent, user.id_persistent, cookies
    )
    assert rsp.status_code == 200
    OwnershipRequestDb.objects.filter(  # pylint: disable=no-member
        id_column_persistent=tag_def_curated.id_persistent
    ).get()


def test_curated_commissioner_to_self(
    auth_server_commissioner,
    user_commissioner,
    tag_def_curated,
):
    "Test wether a commissioner can make an ownership request for a curated tag definition."
    server, cookies = auth_server_commissioner
    rsp = req.post_owner(
        server.url,
        tag_def_curated.id_persistent,
        user_commissioner.id_persistent,
        cookies,
    )
    assert rsp.status_code == 200
    assert 0 == len(
        OwnershipRequestDb.objects.filter(  # pylint: disable=no-member
            id_column_persistent=tag_def_curated.id_persistent
        )
    )
    tag_def = ColumnDb.most_recent_by_id(tag_def_curated.id_persistent)
    assert tag_def.owner == user_commissioner
