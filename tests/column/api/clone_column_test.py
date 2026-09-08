"Test cloning of a column."

from requests import put

from cosmae.column.models_django import column_objects
from cosmae.exception import NotAuthenticatedException
from tests.column.api.requests import clone_column


def test_no_cookies(auth_server):
    "Test that cloning a column without cookies fails."
    response = put(
        auth_server[0].url + "/cosmae/api/columns/id-column/clone",
        cookies=None,
        timeout=900,
    )
    assert response.status_code == 401


def test_unknown_user(request_user, mocker):
    "Test that cloning a column with an unknown user fails."
    mock = mocker.MagicMock()
    mock.side_effect = NotAuthenticatedException()
    with mocker.patch("cosmae.column.api.check_user", mock):
        response = clone_column(request_user, "id-column")
    assert response[0] == 401


def test_no_column(request_user):
    "Test that cloning a non-existing column fails."
    response = clone_column(request_user, "non-existing-column")
    assert response[0] == 404


def test_clone(request_user, column_user):
    "Test that cloning a column with valid parameters succeeds."
    response = clone_column(request_user, column_user.id_persistent)
    assert response[0] == 200
    columns = column_objects().all()
    assert len(columns) == 2
    new_column = columns.filter(id_persistent=response[1].id_persistent).get()
    assert new_column.name == column_user.name + " copy 1"
    assert new_column.id_persistent != column_user.id_persistent
    assert new_column.id > column_user.id
    assert new_column.description == column_user.description
    assert new_column.type == column_user.type
