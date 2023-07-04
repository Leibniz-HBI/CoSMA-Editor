# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,unused-argument
from cosmae.merge_request.models_django import MergeRequest


def test_created_by_user(user, merge_request_user, merge_request_user1):
    mr = MergeRequest.created_by_user(user).get()
    assert str(mr.id_persistent) == str(merge_request_user1.id_persistent)


def test_assigned_to_user(user, merge_request_user, merge_request_user1):
    mr = MergeRequest.assigned_to_user(user).get()
    assert str(mr.id_persistent) == str(merge_request_user.id_persistent)
