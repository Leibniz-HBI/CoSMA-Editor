"Interact with the orcid id"

import logging
from typing import Optional

from django.conf import settings
from requests import get, post


def validate_orcid(user_id: str) -> Optional[str]:
    "Determine whether the input is a valid orcid"
    if user_id.startswith("https://"):
        if user_id[8:15] == "sandbox":
            start_idx = 26
        else:
            start_idx = 18
        id_part = user_id[start_idx:]
    else:
        id_part = user_id
    length = len(id_part)
    if length == 19:
        if id_part[4] != "-" or id_part[9] != "-" or id_part[14] != "-":
            return None
        digits = id_part[:4] + id_part[5:9] + id_part[10:14] + id_part[15:19]
    elif length == 16:
        digits = id_part
        id_part = "-".join([digits[:4], digits[4:8], digits[8:12], digits[12:16]])
    else:
        return None
    checksum = 0
    for digit in digits[:15]:
        checksum = (checksum + int(digit)) * 2
    remainder = checksum % 11
    result = (12 - remainder) % 11
    if (result == 10 and digits[15] == "X") or int(digits[15]) == result:
        return id_part
    return None


class OrcidService:
    # pylint: disable=too-few-public-methods
    "Handles requests to the ORCID API"

    _token = None

    if settings.DEBUG:
        person_url_pattern = "https://pub.sandbox.orcid.org/v3.0/{orcid}/person"
        token_url = "https://sandbox.orcid.org/oauth/token"
    else:
        person_url_pattern = "https://pub.orcid.org/v3.0/{orcid}/person"
        token_url = "https://orcid.org/oauth/token"

    @classmethod
    def get_name(cls, orcid: str):
        "Get the record for an ORCID"
        if OrcidService._token is None:
            cls._get_token()
            if OrcidService._token is None:
                return None
        rsp = get(
            OrcidService.person_url_pattern.format(orcid=orcid),
            headers={
                "Authorization": f"Bearer {OrcidService._token}",
                "Accept": "application/json",
            },
            timeout=900,
        )
        if rsp.status_code != 200:
            return None
        json = rsp.json()
        name_json = json["name"]
        credit_name = name_json.get("credit-name")
        if credit_name is not None:
            return credit_name["value"]
        name = ""
        given = name_json.get("given-names")
        if given is not None:
            name += given["value"]
        family = name_json.get("family-name")
        if family is not None:
            if len(name) > 0:
                name += " "
            name += family["value"]
        return name

    @classmethod
    def _get_token(cls):
        "Retrieve a token from the ORCID API"
        rsp = post(
            OrcidService.token_url,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.ORCID_CLIENT_ID,
                "client_secret": settings.ORCID_CLIENT_SECRET,
                "grant_type": "client_credentials",
                "scope": "/read-public",
            },
            timeout=900,
        )
        if rsp.status_code != 200:
            logging.error("Could not get ORCID token.")
            OrcidService._token = None
            return
        json = rsp.json()
        OrcidService._token = json["access_token"]
