# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name

import pytest

from tests.tag import common as c
from cosmae.exception import (
    InvalidTagValueException,
    NoChildTagDefintionsAllowedException,
    NoParentTagException,
    TagDefinitionExistsException,
)
from cosmae.tag.models_django import TagDefinition


@pytest.mark.django_db
def test_different_name(tag_def):
    tag_def1 = TagDefinition(
        id_persistent=tag_def.id_persistent,
        time_edit=tag_def.time_edit,
        name="changed tag name",
        type=tag_def.type,
    )
    assert tag_def.check_different_before_save(tag_def1)
    assert tag_def1.check_different_before_save(tag_def)


@pytest.mark.django_db
def test_different_id_parent(tag_def):
    tag_def1 = TagDefinition(
        id_persistent=tag_def.id_persistent,
        time_edit=tag_def.time_edit,
        id_parent_persistent=c.id_tag_def_parent_persistent_test,
        name=c.name_tag_def_test,
        type=tag_def.type,
    )
    assert tag_def.check_different_before_save(tag_def1)
    assert tag_def1.check_different_before_save(tag_def)


@pytest.mark.django_db
def test_different_type(tag_def):
    tag_def1 = TagDefinition(
        id_persistent=tag_def.id_persistent,
        time_edit=tag_def.time_edit,
        name=c.name_tag_def_test,
        type=TagDefinition.INTEGER,
    )
    assert tag_def.check_different_before_save(tag_def1)
    assert tag_def1.check_different_before_save(tag_def)


@pytest.mark.django_db
def test_same(tag_def):
    tag_def1 = TagDefinition(
        id_persistent=tag_def.id_persistent,
        time_edit=tag_def.time_edit,
        name=c.name_tag_def_test,
        type=TagDefinition.FLOAT,
    )
    assert not tag_def.check_different_before_save(tag_def1)
    assert not tag_def1.check_different_before_save(tag_def)


@pytest.mark.django_db
def test_store_and_retrieve_tag_def(tag_def):
    tag_def.save()
    retrieved = TagDefinition.objects.get(  # pylint: disable=no-member
        name=c.name_tag_def_test
    )
    assert retrieved == tag_def


@pytest.mark.django_db
def test_missing_parent():
    with pytest.raises(NoParentTagException) as exc:
        TagDefinition.change_or_create(
            c.id_tag_def_persistent_test,
            c.time_edit_test,
            c.name_tag_def_test,
            c.id_tag_def_parent_persistent_test,
        )
    assert exc.value.args[0] == c.id_tag_def_parent_persistent_test


@pytest.mark.django_db
def test_valid_parent_same_name(tag_def):
    tag_def.id_persistent = c.id_tag_def_parent_persistent_test
    tag_def.type = TagDefinition.INNER
    tag_def.save()
    ret, _ = TagDefinition.change_or_create(
        c.id_tag_def_persistent_test,
        c.time_edit_test,
        c.name_tag_def_test,
        c.id_tag_def_parent_persistent_test,
    )
    assert ret.id_parent_persistent == c.id_tag_def_parent_persistent_test


@pytest.mark.django_db
def test_invalid_parent(tag_def):
    tag_def.id_persistent = c.id_tag_def_parent_persistent_test
    tag_def.save()

    with pytest.raises(NoChildTagDefintionsAllowedException) as exc:
        TagDefinition.change_or_create(
            c.id_tag_def_persistent_test,
            c.time_edit_test,
            c.name_tag_def_test,
            c.id_tag_def_parent_persistent_test,
        )
    assert exc.value.args[0] == c.id_tag_def_parent_persistent_test


@pytest.mark.django_db
def test_tag_exists_root(tag_def):
    tag_def.save()

    with pytest.raises(TagDefinitionExistsException) as exc:
        TagDefinition.change_or_create(
            None,
            c.time_edit_test,
            c.name_tag_def_test,
            None,
        )
    assert exc.value.args[0] == c.name_tag_def_test
    assert exc.value.args[1] is None


@pytest.mark.django_db
def test_tag_exists_child(tag_def):
    tag_def.id_persistent = c.id_tag_def_parent_persistent_test
    tag_def.type = TagDefinition.INNER
    tag_def.save()
    old, _ = TagDefinition.change_or_create(
        c.id_tag_def_persistent_test,
        c.time_edit_test,
        c.name_tag_def_test,
        c.id_tag_def_parent_persistent_test,
    )
    old.save()

    with pytest.raises(TagDefinitionExistsException) as exc:
        TagDefinition.change_or_create(
            "other_tag_def_id_test",
            c.time_edit_test,
            c.name_tag_def_test,
            c.id_tag_def_parent_persistent_test,
        )
    assert exc.value.args[0] == c.name_tag_def_test
    assert exc.value.args[1] == c.id_tag_def_parent_persistent_test


@pytest.mark.django_db
def test_tag_exists_rename(tag_def):
    tag_def.type = TagDefinition.INNER
    tag_def.id_persistent = c.id_tag_def_parent_persistent_test
    tag_def.save()
    TagDefinition.change_or_create(
        c.id_tag_def_persistent_test,
        c.time_edit_test,
        c.name_tag_def_test,
        c.id_tag_def_parent_persistent_test,
    )
    with pytest.raises(TagDefinitionExistsException) as exc:
        TagDefinition.change_or_create(
            c.id_tag_def_persistent_test, c.time_edit_test, c.name_tag_def_test, None
        )

    assert exc.value.args[0] == c.name_tag_def_test
    assert exc.value.args[1] is None


@pytest.mark.django_db
def test_float_check_valid(tag_def):
    tag_def.check_value(2.0)


@pytest.mark.django_db
def test_float_check_invalid(tag_def):
    with pytest.raises(InvalidTagValueException) as exc:
        tag_def.check_value(2)
    assert exc.value.args[0] == (
        f"Value has to be a float for tag {c.name_tag_def_test}."
    )


@pytest.mark.django_db
def test_int_check_valid(tag_def):
    tag_def.type = TagDefinition.INTEGER
    tag_def.check_value(2)


@pytest.mark.django_db
def test_int_check_invalid(tag_def):
    tag_def.type = TagDefinition.INTEGER
    with pytest.raises(InvalidTagValueException) as exc:
        tag_def.check_value(2.0)
    assert exc.value.args[0] == (
        f"Value has to be an int for tag {c.name_tag_def_test}."
    )


@pytest.mark.django_db
def test_inner_check_valid(tag_def):
    tag_def.type = TagDefinition.INNER
    tag_def.check_value(None)


@pytest.mark.django_db
def test_inner_check_invalid(tag_def):
    tag_def.type = TagDefinition.INNER
    with pytest.raises(InvalidTagValueException) as exc:
        tag_def.check_value(True)
    assert exc.value.args[0] == (
        f"Value has to be null for inner tag {c.name_tag_def_test}."
    )
