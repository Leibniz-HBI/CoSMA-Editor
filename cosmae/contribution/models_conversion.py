"Convert models between database and API representation."

from cosmae.column.models_conversion import column_db_dict_to_api
from cosmae.contribution.models_api import ContributionCandidate
from cosmae.contribution.models_django import (
    ContributionCandidate as ContributionCandidateDb,
)

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
    if hasattr(contribution_db, "matched_columns"):
        if contribution_db.matched_columns is None:
            match_column_list = []
        else:
            match_column_list = [
                column_db_dict_to_api(column)
                for column in contribution_db.matched_columns
                if column is not None
            ]
    else:
        match_column_list = None
    return ContributionCandidate(
        id_persistent=str(contribution_db.id_persistent),
        name=contribution_db.name,
        description=contribution_db.description,
        has_header=contribution_db.has_header,
        state=_contribution_state_mapping_db_to_api[contribution_db.state],
        author=author,
        error_msg=contribution_db.error_msg,
        error_details=contribution_db.error_trace,
        match_column_list=match_column_list,
        empty_values=contribution_db.empty_values,
        justification_txt=contribution_db.justification,
        id_edit_session_persistent=contribution_db.edit_session_id,
        mark_delete=contribution_db.mark_delete,
    )
