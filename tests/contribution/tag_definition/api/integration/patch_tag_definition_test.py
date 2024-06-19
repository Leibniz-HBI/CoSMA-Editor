# pylint: disable=missing-module-docstring, missing-function-docstring,redefined-outer-name,invalid-name,disable=unused-argument, no-member
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import tests.contribution.api.integration.common as c
import tests.contribution.api.integration.requests as req_contrib
import tests.contribution.tag_definition.api.integration.requests as req
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.tag.models_django import TagDefinition, TagDefinitionHistory
from cosmae.util.auth import NotAuthenticatedException


def candidate_id_with_extracted(server, cookies):
    rsp = req_contrib.post_contribution(
        server.url, c.contribution_test_upload0, cookies=cookies
    )
    assert rsp.status_code == 200
    id_persistent_candidate = rsp.json()["id_persistent"]
    candidate = ContributionCandidate.objects.get(id_persistent=id_persistent_candidate)
    candidate.state = ContributionCandidate.COLUMNS_EXTRACTED
    candidate.save()
    definition = TagDefinitionContribution.objects.create(
        name="tag definition_test",
        id_persistent=uuid4(),
        index_in_file=9000,
        contribution_candidate=candidate,
    )
    return candidate.id_persistent, definition.id_persistent


def test_unknown_user(auth_server):
    mock = MagicMock()
    mock.side_effect = NotAuthenticatedException()
    server, cookies = auth_server
    with patch("cosmae.contribution.tag_definition.api.check_user", mock):
        rsp = req.patch_tag_definition(
            server.url,
            "id-contribution-test",
            "id-tag-definition-test",
            {"id_existing_persistent": "id-existing"},
            cookies=cookies,
        )
        assert rsp.status_code == 401


def test_no_cookies(auth_server):
    server, _ = auth_server
    rsp = req.patch_tag_definition(
        server.url,
        "id-contribution-test",
        "id-tag-definition-test",
        {"id_existing_persistent": "id-existing"},
    )
    assert rsp.status_code == 401


def test_404_candidate(auth_server):
    server, cookies = auth_server
    rsp = req.patch_tag_definition(
        server.url,
        str(uuid4()),
        "id-tag-definition-test",
        {"id_existing_persistent": "id-existing"},
        cookies=cookies,
    )
    assert rsp.status_code == 404
    assert rsp.json()["msg"] == "Contribution candidate does not exist."


def test_404_tag_definition(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, _ = candidate_id_with_extracted(server, cookies)
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        str(uuid4()),
        {"id_existing_persistent": "id-existing"},
        cookies=cookies,
    )
    assert rsp.status_code == 404
    assert rsp.json()["msg"] == "Tag definition does not exist."


def test_columns_not_extracted(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    candidate = ContributionCandidate.objects.get(id_persistent=id_candidate_persistent)
    candidate.state = ContributionCandidate.COLUMNS_ASSIGNED
    candidate.save()
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": "display_txt"},
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert (
        rsp.json()["msg"] == "You can only change column assignments, when"
        ' the contribution state is "COLUMNS_EXTRACTED".'
    )


def test_patch_display_txt(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": "display_txt"},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_tag_definition(server.url, id_candidate_persistent, cookies)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_tag_definition_list"] = []
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [
            {
                "name": "tag definition_test",
                "discard": False,
                "id_existing_persistent": "display_txt",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    rsp = req_contrib.get_contribution(
        server.url, id_candidate_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == expected_contribution


def test_patch_id_persistent(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": "id_persistent"},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_tag_definition(server.url, id_candidate_persistent, cookies)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_tag_definition_list"] = []
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [
            {
                "name": "tag definition_test",
                "discard": False,
                "id_existing_persistent": "id_persistent",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    rsp = req_contrib.get_contribution(
        server.url, id_candidate_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == expected_contribution


def test_patch_id_unknown_special_tag(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": "unknown"},
        cookies=cookies,
    )
    assert rsp.status_code == 400
    assert rsp.json()["msg"] == "Existing tag definition does not exist."


def test_patch_id_existing(auth_server, user):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    new_id_existing = str(uuid4)
    TagDefinitionHistory.objects.create(
        name="existing tag def test",
        type=TagDefinition.INNER,
        id_persistent=new_id_existing,
        time_edit=datetime.now(),
        written_by=user.id_persistent,
        approved_by=user.id_persistent,
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": new_id_existing},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_tag_definition(server.url, id_candidate_persistent, cookies)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_tag_definition_list"] = []
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [
            {
                "name": "tag definition_test",
                "discard": False,
                "id_existing_persistent": new_id_existing,
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    rsp = req_contrib.get_contribution(
        server.url, id_candidate_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == expected_contribution


def test_patch_id_existing_display_txt(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": "display_txt"},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_tag_definition(server.url, id_candidate_persistent, cookies)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_tag_definition_list"] = []
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [
            {
                "name": "tag definition_test",
                "discard": False,
                "id_existing_persistent": "display_txt",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    rsp = req_contrib.get_contribution(
        server.url, id_candidate_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == expected_contribution


def test_patch_id_existing_justification(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"id_existing_persistent": "justification"},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_tag_definition(server.url, id_candidate_persistent, cookies)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_tag_definition_list"] = []
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [
            {
                "name": "tag definition_test",
                "discard": False,
                "id_existing_persistent": "justification",
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    rsp = req_contrib.get_contribution(
        server.url, id_candidate_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == expected_contribution


def test_patch_discard(auth_server):
    server, cookies = auth_server
    id_candidate_persistent, id_definition_persistent = candidate_id_with_extracted(
        server, cookies
    )
    rsp = req.patch_tag_definition(
        server.url,
        id_candidate_persistent,
        id_definition_persistent,
        {"discard": False},
        cookies=cookies,
    )
    assert rsp.status_code == 200
    rsp = req.get_tag_definition(server.url, id_candidate_persistent, cookies)
    expected_contribution = c.contribution_test_upload0.copy()
    expected_contribution["state"] = "COLUMNS_EXTRACTED"
    expected_contribution["id_persistent"] = str(id_candidate_persistent)
    expected_contribution["match_tag_definition_list"] = []
    assert rsp.status_code == 200
    assert rsp.json() == {
        "tag_definitions": [
            {
                "name": "tag definition_test",
                "discard": False,
                "id_existing_persistent": None,
                "id_persistent": str(id_definition_persistent),
                "index_in_file": 9000,
            }
        ],
    }
    rsp = req_contrib.get_contribution(
        server.url, id_candidate_persistent, cookies=cookies
    )
    assert rsp.status_code == 200
    json = rsp.json()
    assert json == expected_contribution
