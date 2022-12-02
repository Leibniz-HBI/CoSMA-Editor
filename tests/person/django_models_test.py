# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

import pytest

from tests.person import common as c
from cosmae.entity.models_django import Entity
from cosmae.person.models_django import Person


def test_no_key_mix():
    """Just check if the assumed invariant for combining keys holds.
    I.e., that the dictionaries are not changed."""
    person_keys = Person.valid_keys()
    entity_keys = Entity.valid_keys()
    assert entity_keys != person_keys
    person_keys_after = Person.valid_keys()
    entity_keys_after = Entity.valid_keys()
    assert entity_keys == entity_keys_after
    assert person_keys == person_keys_after


@pytest.fixture
def person():
    return Person(
        id_persistent=c.id_persistent_test,
        names_family=c.names_family_test,
        names_personal=c.names_personal_test,
        display_txt=c.display_txt_test,
        time_edit=c.time_edit_test,
    )


def test_create_person(person):
    assert person.id_persistent == c.id_persistent_test
    assert person.names_family == c.names_family_test
    assert person.names_personal == c.names_personal_test
    assert person.display_txt == c.display_txt_test
    assert person.time_edit == c.time_edit_test


@pytest.mark.django_db
def test_store_and_retrieve_person(person):
    person.save()
    retrieved = Person.objects.get(names_family=c.names_family_test)
    assert retrieved == person


@pytest.mark.django_db
def test_does_not_get_other_entities(person):
    person.save()
    entity = Entity(time_edit=c.time_edit_test)
    entity.save()
    persons = list(Person.objects.all())
    assert len(persons) == 1
    assert persons[0] == person
    entities = list(Entity.objects.all())  # pylint: disable=no-member
    assert len(entities) == 2
