"Test ORCID API person retrieval"

import tests.edit_session.common as c
from cosmae.edit_session.orcid import OrcidService


def test_success(get_orcid_token_mock, get_orcid_person_mock):
    "Check successful retrieval of token and name"
    name = OrcidService.get_name(c.orcid_no_uri)
    assert name == c.name_orcid
    get_orcid_token_mock.assert_called_once_with(
        "https://sandbox.orcid.org/oauth/token",
        headers={"Accept": "application/json"},
        data={
            "client_id": "orcid_test_client_id",
            "client_secret": "orcid_test_client_secret",
            "grant_type": "client_credentials",
            "scope": "/read-public",
        },
        timeout=900,
    )
    get_orcid_person_mock.assert_called_once_with(
        f"https://pub.sandbox.orcid.org/v3.0/{c.orcid_no_uri}/person",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {c.access_token}",
        },
        timeout=900,
    )


def test_does_not_refresh_token(get_orcid_token_mock, get_orcid_person_mock, mocker):
    "Check that token is not refreshed when present."
    mocker.patch.object(OrcidService, "_token", c.access_token)
    name = OrcidService.get_name(c.orcid_no_uri)
    assert name == c.name_orcid
    get_orcid_token_mock.assert_not_called()
    get_orcid_person_mock.assert_called_once_with(
        f"https://pub.sandbox.orcid.org/v3.0/{c.orcid_no_uri}/person",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {c.access_token}",
        },
        timeout=900,
    )


def test_personal_names_only(get_orcid_person_mock, mocker):
    "Check that token is not refreshed when present."
    mocker.patch.object(OrcidService, "_token", c.access_token)
    json_mock = mocker.Mock(
        return_value={
            "name": {
                "credit-name": None,
                "given-names": {"value": c.names_personal},
            },
        }
    )
    get_orcid_person_mock.return_value.json = json_mock
    name = OrcidService.get_name(c.orcid_no_uri)
    assert name == c.names_personal


def test_family_name_only(get_orcid_person_mock, mocker):
    "Check that token is not refreshed when present."
    mocker.patch.object(OrcidService, "_token", c.access_token)
    json_mock = mocker.Mock(
        return_value={
            "name": {
                "credit-name": None,
                "family-name": {"value": c.name_family},
            },
        }
    )
    get_orcid_person_mock.return_value.json = json_mock
    name = OrcidService.get_name(c.orcid_no_uri)
    assert name == c.name_family


def test_full_personal_name(get_orcid_person_mock, mocker):
    "Check that token is not refreshed when present."
    mocker.patch.object(OrcidService, "_token", c.access_token)
    json_mock = mocker.Mock(
        return_value={
            "name": {
                "credit-name": None,
                "given-names": {"value": c.names_personal},
                "family-name": {"value": c.name_family},
            },
        }
    )
    get_orcid_person_mock.return_value.json = json_mock
    name = OrcidService.get_name(c.orcid_no_uri)
    assert name == f"{c.names_personal} {c.name_family}"
