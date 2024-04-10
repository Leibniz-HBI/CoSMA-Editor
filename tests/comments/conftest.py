# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name
import pytest

import tests.comments.common as c
from cosmae.comments.models_django import Comment


@pytest.fixture
def comment_0_0():
    Comment.add_comment(c.id_persistent_comment, c.comment_test_0_0)


@pytest.fixture
def comment_0_1():
    Comment.add_comment(c.id_persistent_comment, c.comment_test_0_1)


@pytest.fixture
def comment_1_0():
    Comment.add_comment(c.id_persistent_comment1, c.comment_test_1_0)


@pytest.fixture
def comment_1_1():
    Comment.add_comment(c.id_persistent_comment1, c.comment_test_1_1)
