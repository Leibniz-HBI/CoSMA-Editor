"Convert models between database and API representation."
from cosmae.contribution.models_api import ContributionCandidate
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)

_contribution_state_mapping_db_to_api = {
    ContributionCandidateDb.UPLOADED: "UPLOADED",
    ContributionCandidateDb.COLUMNS_EXTRACTED: "COLUMNS_EXTRACTED",
    ContributionCandidateDb.COLUMNS_ASSIGNED: "COLUMNS_ASSIGNED",
    ContributionCandidateDb.ENTITIES_MATCHED: "ENTITIES_MATCHED",
    ContributionCandidateDb.ENTITIES_ASSIGNED: "ENTITIES_ASSIGNED",
    ContributionCandidateDb.VALUES_ASSIGNED: "VALUES_ASSIGNED",
    ContributionCandidateDb.MERGED: "MERGED",
}


def contribution_db_to_api(
    contribution_db: ContributionCandidateDb,
) -> ContributionCandidate:
    "Transform a contribution candidate from DB to API representation."
    if contribution_db.anonymous:
        author = None
    else:
        author = contribution_db.created_by.username
    return ContributionCandidate(
        id_persistent=str(contribution_db.id_persistent),
        name=contribution_db.name,
        description=contribution_db.description,
        anonymous=contribution_db.anonymous,
        has_header=contribution_db.has_header,
        state=_contribution_state_mapping_db_to_api[contribution_db.state],
        author=author,
    )
