# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
import tests.comments.api.integration.requests as req
import tests.comments.common as c
from cosmae.comments.models_django import Comment


def test_not_authorized(auth_server):
    server, _ = auth_server
    rsp = req.post_comments(server.url, c.id_persistent_comment, c.comment_test_0_0)
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    server, cookies = auth_server_applicant
    rsp = req.post_comments(
        server.url, c.id_persistent_comment, c.comment_test_0_0, cookies=cookies
    )
    assert rsp.status_code == 403


def test_post_comment(auth_server):
    server, cookies = auth_server
    rsp = req.post_comments(
        server.url, c.id_persistent_comment, c.comment_test_0_0, cookies=cookies
    )
    assert rsp.status_code == 200
    assert (
        Comment.objects.all().get().content  # pylint: disable=no-member
        == c.comment_test_0_0
    )
