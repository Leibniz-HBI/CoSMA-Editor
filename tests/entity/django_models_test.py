# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

import pytest
from django.forms import model_to_dict

import tests.entity.common as c
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import Entity, EntityHistory
from cosmae.exception import DbObjectExistsException, EntityUpdatedException
from cosmae.util import timestamp


@pytest.fixture
def updated_entity0(entity0, user):
    return EntityHistory.change_or_create_versioned(
        id_persistent=c.id_persistent_test_0,
        time_edit=c.time_edit_test_1,
        written_by_session=user.edit_session,
        version=entity0.id,
        display_txt="changed display text",
    )[0]


@pytest.mark.django_db
def test_get_most_recent_history(entity0, updated_entity0):
    updated_entity0.previous_version = entity0
    updated_entity0.save()
    most_recent = EntityHistory.most_recent_by_id(c.id_persistent_test_0)
    assert most_recent == updated_entity0
    assert most_recent.id != entity0.id


@pytest.mark.django_db
def test_get_most_recent_view(entity0, updated_entity0):
    updated_entity0.previous_version = entity0
    updated_entity0.save()
    most_recent = Entity.most_recent_by_id(c.id_persistent_test_0)
    assert model_to_dict(most_recent) == model_to_dict(updated_entity0)
    assert most_recent.id != entity0.id


@pytest.mark.django_db
def test_creation(user):
    created, do_write = EntityHistory.change_or_create_versioned(
        id_persistent=c.id_persistent_test_0,
        display_txt="new_txt",
        time_edit=c.time_edit_test_1,
        version=None,
        written_by_session=user.edit_session,
    )
    assert do_write
    assert created.previous_version is None
    assert created.time_edit == c.time_edit_test_1
    assert created.display_txt == "new_txt"


@pytest.mark.django_db
def test_update(entity0, user):
    entity0.save()
    updated, do_write = EntityHistory.change_or_create_versioned(
        id_persistent=entity0.id_persistent,
        display_txt="new_txt",
        time_edit=c.time_edit_test_1,
        version=entity0.id,
        written_by_session=user.edit_session,
    )
    assert do_write
    assert updated.previous_version == entity0
    assert updated.time_edit == c.time_edit_test_1
    assert updated.display_txt == "new_txt"


@pytest.mark.django_db
def test_no_update_on_same(entity0, user):
    entity0.save()
    updated, do_write = EntityHistory.change_or_create_versioned(
        id_persistent=entity0.id_persistent,
        display_txt=entity0.display_txt,
        time_edit=c.time_edit_test_1,
        version=entity0.id,
        written_by_session=user.edit_session,
    )
    assert not do_write
    assert entity0 == updated


@pytest.mark.django_db
def test_no_update_without_version(entity0, user):
    entity0.save()
    with pytest.raises(DbObjectExistsException):
        EntityHistory.change_or_create_versioned(
            id_persistent=entity0.id_persistent,
            display_txt="new_txt",
            time_edit=c.time_edit_test_1,
            written_by_session=user.edit_session,
        )


@pytest.mark.django_db
def test_no_update_on_older_version(entity0, updated_entity0, user):
    entity0.save()
    updated_entity0.save()
    with pytest.raises(EntityUpdatedException):
        EntityHistory.change_or_create_versioned(
            id_persistent=entity0.id_persistent,
            display_txt="new_txt",
            time_edit=c.time_edit_test_1,
            version=entity0.id,
            written_by_session=user.edit_session,
        )


@pytest.mark.django_db
def test_chunk_correctly(entity0, updated_entity0, user):
    entity0.save()
    updated_entity0.save()
    entities = [updated_entity0]
    for i in range(10):
        entity, _ = EntityHistory.change_or_create_versioned(
            id_persistent=f"id_persistent_test{i+10}",
            time_edit=c.time_edit_test_0,
            written_by_session=user.edit_session,
        )
        entity.save()
        entities.append(entity)
    offset = updated_entity0.id
    chunks = [Entity.objects.chunk(offset + i * 2, 2) for i in range(6)]
    flat = [model_to_dict(x) for chunk in chunks for x in chunk if chunk]
    assert flat == [model_to_dict(entity) for entity in entities]


@pytest.mark.django_db
def test_different_display_txt(entity0):
    entity1 = EntityHistory(
        id_persistent=entity0.id_persistent,
        time_edit=entity0.time_edit,
        display_txt="test display",
    )
    assert entity0.check_different_before_save(entity1)


@pytest.mark.django_db
def test_different_id_persistent(entity0):
    entity1 = EntityHistory(
        id_persistent="other id",
        time_edit=entity0.time_edit,
    )
    assert entity0.check_different_before_save(entity1)


@pytest.mark.django_db
def test_different_version(entity0):
    entity1 = EntityHistory(
        id_persistent=entity0.id_persistent,
        time_edit=entity0.time_edit,
        previous_version=entity0,
        display_txt=entity0.display_txt,
    )
    assert not entity0.check_different_before_save(entity1)


@pytest.mark.django_db
def test_keeps_contribution_candidate(entity0, user):
    contribution = ContributionCandidate.objects.create(  # pylint: disable=no-member
        name="contribution entity test",
        description="contribution objects used in entity tests",
        id_persistent="9c6b5603-6fde-42f3-92a9-7d125449af43",
        has_header=True,
        created_by=user,
        file_name="test.csv",
        state=ContributionCandidate.COLUMNS_EXTRACTED,
    )
    entity0.contribution_candidate = contribution
    entity0.save()

    changed, do_write = EntityHistory.change_or_create_versioned(
        id_persistent=entity0.id_persistent,
        time_edit=timestamp(),
        version=entity0.id,
        display_txt="entity for contribution test",
        written_by_session=user.edit_session,
    )
    assert (
        str(changed.contribution_candidate.id_persistent) == contribution.id_persistent
    )
    assert do_write
