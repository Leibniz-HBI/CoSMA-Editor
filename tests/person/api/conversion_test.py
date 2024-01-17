# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
from unittest.mock import patch

import pytest

import tests.tag.common as ct
from tests.person import common as c
from cosmae.entity.models_django import Entity as EntityDb
from cosmae.entity.queue import entity_display_txt_information_cache
from cosmae.exception import ValidationException
from cosmae.person import api


@pytest.mark.django_db
def test_conversion_api_to_db_without_id():
    person_api = api.PersonNatural(
        display_txt=c.display_txt_test,
        version=None,
    )
    with patch("cosmae.person.api.uuid4") as uuid_mock:
        uuid_mock.return_value = c.id_persistent_test
        person_db, _ = api.person_api_to_db(person_api, c.time_edit_test)
    assert person_db.display_txt == c.display_txt_test
    assert person_db.previous_version is None
    assert person_db.id_persistent == c.id_persistent_test


@pytest.mark.django_db
def test_conversion_api_to_db_with_id():
    prev = EntityDb(
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
        time_edit=c.time_edit_test,
    )
    prev.save()
    person_api = api.PersonNatural(
        display_txt=c.display_txt_test + " changed",
        version=prev.id,  # pylint: disable=no-member
        id_persistent=c.id_persistent_test,
    )
    person_db, _ = api.person_api_to_db(person_api, c.time_edit_test)
    assert person_db.display_txt == c.display_txt_test + " changed"
    assert person_db.id_persistent == c.id_persistent_test
    assert person_db.previous_version_id is prev.id  # pylint: disable=no-member


def test_conversion_api_to_db_with_id_no_version():
    person_api = api.PersonNatural(
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
    )
    with pytest.raises(ValidationException):
        api.person_api_to_db(person_api, c.time_edit_test)


def test_conversion_api_to_db_no_id_with_version():
    person_api = api.PersonNatural(
        display_txt=c.display_txt_test,
        version=5,  # pylint: disable=no-member
    )
    with pytest.raises(ValidationException):
        api.person_api_to_db(person_api, c.time_edit_test)


@pytest.mark.django_db
def test_conversion_db_to_api_no_cache():
    person_db = EntityDb(
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
        time_edit=c.time_edit_test,
        id=5,
    )
    person_api_expected = api.PersonNatural(
        display_txt=c.display_txt_test,
        display_txt_details="Display Text",
        version=5,  # pylint: disable=no-member
        id_persistent=c.id_persistent_test,
        disabled=False,
    )
    person_api = api.person_db_to_api(person_db)
    assert person_api_expected == person_api


@pytest.mark.django_db
def test_conversion_db_to_api_display_txt_in_cache():
    cache_display_txt = "cache display txt"
    id_entity_persistent = "eeae8974-1269-4836-8154-6e0d4a7dbf24"
    entity_display_txt_information_cache.set(
        id_entity_persistent, (cache_display_txt, "Display Text")
    )
    person_db = EntityDb(
        display_txt=c.display_txt_test,
        id_persistent=id_entity_persistent,
        time_edit=c.time_edit_test,
        id=5,
    )
    person_api_expected = api.PersonNatural(
        display_txt=c.display_txt_test,
        display_txt_details="Display Text",
        version=5,  # pylint: disable=no-member
        id_persistent=id_entity_persistent,
        disabled=False,
    )
    person_api = api.person_db_to_api(person_db)
    assert person_api_expected == person_api


@pytest.mark.django_db
def test_conversion_db_to_api_id_persistent_in_cache_but_display_txt():
    entity_display_txt_information_cache.set(
        c.id_persistent_test, (c.id_persistent_test, "id_persistent")
    )
    person_db = EntityDb(
        display_txt=c.display_txt_test,
        id_persistent=c.id_persistent_test,
        time_edit=c.time_edit_test,
        id=5,
    )
    person_api_expected = api.PersonNatural(
        display_txt=c.display_txt_test,
        display_txt_details="Display Text",
        version=5,  # pylint: disable=no-member
        id_persistent=c.id_persistent_test,
        disabled=False,
    )
    person_api = api.person_db_to_api(person_db)
    assert person_api_expected == person_api


@pytest.mark.django_db
def test_conversion_db_to_api_UNKNOWN_in_cache_no_display_txt():
    entity_display_txt_information_cache.set(
        c.id_persistent_test, (c.id_persistent_test, "id_persistent")
    )
    person_db = EntityDb(
        display_txt=None,
        id_persistent=c.id_persistent_test,
        time_edit=c.time_edit_test,
        id=5,
    )
    person_api_expected = api.PersonNatural(
        display_txt=c.id_persistent_test,
        display_txt_details="id_persistent",
        version=5,  # pylint: disable=no-member
        id_persistent=c.id_persistent_test,
        disabled=False,
    )
    person_api = api.person_db_to_api(person_db)
    assert person_api_expected == person_api


@pytest.mark.django_db
def test_conversion_db_to_api_tag_def_in_cache():
    cache_display_txt = "cache display_txt"
    id_entity_persistent = "873eccfb-cf6c-4ade-bdb4-5aae8f9668e2"
    cache_tag_def = {
        "id_persistent": ct.id_tag_persistent_test,
        "id_parent_persistent": None,
        "name": ct.name_tag_def_test,
        "type": "STR",
        "hidden": False,
        "curated": True,
        "owner": None,
        "id": 500,
    }
    entity_display_txt_information_cache.set(
        id_entity_persistent, (cache_display_txt, cache_tag_def)
    )
    person_db = EntityDb(
        display_txt=None,
        id_persistent=id_entity_persistent,
        time_edit=c.time_edit_test,
        id=5,
    )
    person_api_expected = api.PersonNatural(
        display_txt=cache_display_txt,
        display_txt_details={
            "id_persistent": ct.id_tag_persistent_test,
            "id_parent_persistent": None,
            "name": ct.name_tag_def_test,
            "name_path": [ct.name_tag_def_test],
            "type": "STRING",
            "hidden": False,
            "curated": True,
            "owner": None,
            "version": 500,
        },
        version=5,  # pylint: disable=no-member
        id_persistent=id_entity_persistent,
        disabled=False,
    )
    person_api = api.person_db_to_api(person_db)
    assert person_api_expected == person_api
