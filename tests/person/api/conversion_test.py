# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import patch

import pytest

from tests.person import common as c
from cosmae.exception import ValidationException
from cosmae.person import api
from cosmae.person.models_django import Person as PersonNaturalDb


@pytest.mark.django_db
def test_conversion_api_to_db_without_id():
    person_api = api.PersonNatural(
        names_personal=c.names_personal_test,
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        version=None,
    )
    with patch("cosmae.person.api.uuid4") as uuid_mock:
        uuid_mock.return_value = c.id_persistent_test
        person_db, _ = api.person_api_to_db(person_api, c.time_edit_test)
    assert person_db.names_personal == c.names_personal_test
    assert person_db.names_family == c.names_family_test
    assert person_db.display_txt == c.display_txt_test
    assert person_db.previous_version is None
    assert person_db.id_persistent == c.id_persistent_test


@pytest.mark.django_db
def test_convertsion_api_to_db_with_id():
    prev = PersonNaturalDb(
        names_personal="old names",
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
        time_edit=c.time_edit_test,
    )
    prev.save()
    person_api = api.PersonNatural(
        names_personal=c.names_personal_test,
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        version=prev.id,  # pylint: disable=no-member
        id_persistent=c.id_persistent_test,
    )
    person_db, _ = api.person_api_to_db(person_api, c.time_edit_test)
    assert person_db.names_personal == c.names_personal_test
    assert person_db.names_family == c.names_family_test
    assert person_db.display_txt == c.display_txt_test
    assert person_db.id_persistent == c.id_persistent_test
    assert person_db.previous_version_id is prev.id  # pylint: disable=no-member


def test_convertsion_api_to_db_with_id_no_version():
    person_api = api.PersonNatural(
        names_personal=c.names_personal_test,
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
    )
    with pytest.raises(ValidationException):
        api.person_api_to_db(person_api, c.time_edit_test)


def test_convertsion_api_to_db_no_id_with_version():
    person_api = api.PersonNatural(
        names_personal=c.names_personal_test,
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        version=5,  # pylint: disable=no-member
    )
    with pytest.raises(ValidationException):
        api.person_api_to_db(person_api, c.time_edit_test)


@pytest.mark.django_db
def test_conversion_db_to_api():
    person_db = PersonNaturalDb(
        names_personal=c.names_personal_test,
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
        time_edit=c.time_edit_test,
        id=5,
    )
    person_api_expected = api.PersonNatural(
        names_personal=c.names_personal_test,
        names_family=c.names_family_test,
        display_txt=c.display_txt_test,
        version=5,  # pylint: disable=no-member
        id_persistent=c.id_persistent_test,
    )
    person_api = api.person_db_to_api(person_db)
    assert person_api_expected == person_api
