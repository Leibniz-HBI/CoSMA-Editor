# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
import tests.comments.api.integration.requests as req
import tests.comments.common as c
import tests.user.common as cu
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
    comment = Comment.objects.all().get()  # pylint: disable=no-member
    assert comment.content == c.comment_test_0_0
    assert comment.author.username == cu.test_username
