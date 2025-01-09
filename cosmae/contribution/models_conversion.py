"Convert models between database and API representation."

from cosmae.contribution.models_api import ContributionCandidate
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)
from cosmae.tag.api.models_conversion import tag_definition_db_dict_to_api

_contribution_state_mapping_db_to_api = {
    ContributionCandidateDb.UPLOADED: "UPLOADED",
    ContributionCandidateDb.COLUMNS_EXTRACTED: "COLUMNS_EXTRACTED",
    ContributionCandidateDb.COLUMNS_ASSIGNED: "COLUMNS_ASSIGNED",
    ContributionCandidateDb.VALUES_EXTRACTED: "VALUES_EXTRACTED",
    ContributionCandidateDb.ENTITIES_MATCHED: "ENTITIES_MATCHED",
    ContributionCandidateDb.ENTITIES_ASSIGNED: "ENTITIES_ASSIGNED",
    ContributionCandidateDb.VALUES_ASSIGNED: "VALUES_ASSIGNED",
    ContributionCandidateDb.MERGED: "MERGED",
}


def contribution_db_to_api(
    contribution_db: ContributionCandidateDb,
) -> ContributionCandidate:
    "Transform a contribution candidate from DB to API representation."
    author = contribution_db.created_by.username
    if hasattr(contribution_db, "matched_tag_definitions"):
        if contribution_db.matched_tag_definitions is None:
            match_tag_definition_list = []
        else:
            match_tag_definition_list = [
                tag_definition_db_dict_to_api(tag_def)
                for tag_def in contribution_db.matched_tag_definitions
                if tag_def is not None
            ]
    else:
        match_tag_definition_list = None
    return ContributionCandidate(
        id_persistent=str(contribution_db.id_persistent),
        name=contribution_db.name,
        description=contribution_db.description,
        has_header=contribution_db.has_header,
        state=_contribution_state_mapping_db_to_api[contribution_db.state],
        author=author,
        error_msg=contribution_db.error_msg,
        error_details=contribution_db.error_trace,
        match_tag_definition_list=match_tag_definition_list,
        empty_values=contribution_db.empty_values,
        justification_txt=contribution_db.justification,
        id_edit_session_persistent=contribution_db.edit_session_id,
    )
