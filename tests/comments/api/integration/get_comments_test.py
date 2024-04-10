# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name, unused-argument
import tests.comments.api.integration.requests as req
import tests.comments.common as c


def test_not_authorized(auth_server):
    server, _ = auth_server
    rsp = req.get_comments(server.url, [c.id_persistent_comment])
    assert rsp.status_code == 401


def test_applicant(auth_server_applicant):
    server, cookies = auth_server_applicant
    rsp = req.get_comments(
        server.url, [c.id_persistent_comment, c.id_persistent_comment1], cookies=cookies
    )
    assert rsp.status_code == 403


def test_gets_comments(auth_server, comment_0_0, comment_0_1, comment_1_0, comment_1_1):
    server, cookies = auth_server
    rsp = req.get_comments(
        server.url, [c.id_persistent_comment, c.id_persistent_comment1], cookies=cookies
    )
    comments_by_id = rsp.json()["comments_by_id_persistent"]
    assert len(comments_by_id) == 2
    for comments in comments_by_id.values():
        assert len(({comment["content"] for comment in comments})) == 2
