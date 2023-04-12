# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import MagicMock, patch

from django.db import IntegrityError

from tests.person.api.integration.requests import get_count, post_person


def test_get_count(auth_server):
    live_server, cookies = auth_server
    for i in range(10):
        id_prev = None
        version_prev = None
        for j in range(3):
            person = dict(
                names_personal="test personal",
                names_family=f"test family {i:02d}",
                display_txt=f"display test {i:02d} {j}",
            )
            if id_prev and version_prev:
                person["id_persistent"] = id_prev
                person["version"] = version_prev
            rsp = post_person(live_server.url, person, cookies=cookies)
            assert rsp.status_code == 200
            persons = rsp.json()
            id_prev = persons["persons"][0]["id_persistent"]
            version_prev = persons["persons"][0]["version"]
    count = get_count(live_server.url, cookies=cookies)
    assert count.json()["count"] == 10


def test_bad_db(auth_server):
    live_server, cookies = auth_server
    mock = MagicMock()
    mock.side_effect = IntegrityError()
    with patch("cosmae.person.models_django.Person.get_count", mock):
        rsp = get_count(live_server.url, cookies=cookies)
    assert rsp.status_code == 500
    assert rsp.json()["msg"] == "Could not count persons."
