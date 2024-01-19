"Queue job for ingesting data after columns have been assigned."
import logging
from datetime import datetime
from typing import List, Tuple
from uuid import uuid4

from django.db import transaction
from django.db.utils import OperationalError

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.contribution.tag_definition.queue.util import read_csv_of_candidate
from cosmae.entity.models_django import Entity
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import TagDefinition, TagInstanceHistory


def mk_display_txt_extractor(idx):
    """Create a function to read the display text from csv rows.
    If the index is None a function always returning None is the result of this function.
    """
    if idx is None:
        return lambda _: None
    return lambda row_tpl: row_tpl[idx]


def is_row_empty(
    display_txt, row_tpl, column_assignment: List[Tuple[int, TagDefinition]]
):
    "Check if the entries of a row are empty for a given column assignment."
    display_txt_str = str(display_txt)
    if not (
        display_txt_str == "None" or display_txt_str == "" or display_txt_str.isspace()
    ):
        return False
    for idx, _ in column_assignment:
        val = row_tpl[idx]
        if val is None:
            continue
        val_string = str(val)
        if val_string == "" or val_string.isspace():
            continue
        return False
    return True


def ingest_values_from_csv(id_contribution_persistent):
    # pylint: disable=too-many-locals
    "Reads values from a csv files according to column assignments of a contribution candidate"

    contribution_query = (
        ContributionCandidate.objects.filter(  # pylint: disable=no-member
            id_persistent=id_contribution_persistent
        ).select_for_update()
    )
    try:
        with transaction.atomic():
            try:
                contribution = contribution_query.get()
            except OperationalError:
                return
            active_columns = (
                TagDefinitionContribution.objects.filter(  # pylint: disable=no-member
                    contribution_candidate=contribution, discard=False
                )
            )
            time_add = datetime.now()
            display_txt_idx = None
            column_assignments = []
            tag_definition_pairs = []
            for column_assignment in active_columns:
                if column_assignment.id_existing_persistent == "display_txt":
                    display_txt_idx = column_assignment.index_in_file
                else:
                    tag_definition_destination = TagDefinition.most_recent_by_id(
                        column_assignment.id_existing_persistent
                    )
                    tag_definition_origin, _ = TagDefinition.change_or_create(
                        id_persistent=str(uuid4()),
                        name=tag_definition_destination.name
                        + " Merge Request "
                        + contribution.name,
                        id_parent_persistent=tag_definition_destination.id_persistent,
                        type=tag_definition_destination.type,
                        time_edit=time_add,
                        owner=contribution.created_by,
                    )
                    tag_definition_origin.save()
                    column_assignments.append(
                        (column_assignment.index_in_file, tag_definition_origin)
                    )
                    tag_definition_pairs.append(
                        (tag_definition_origin, tag_definition_destination)
                    )
            display_txt_extractor = mk_display_txt_extractor(display_txt_idx)
            data_frame = read_csv_of_candidate(contribution)
            for row_tpl in data_frame.itertuples(index=False):
                display_txt = display_txt_extractor(row_tpl)
                if is_row_empty(
                    display_txt,
                    row_tpl,
                    column_assignments,  # pylint: disable = undefined-loop-variable
                ):
                    continue
                id_entity_persistent = str(uuid4())
                entity, _ = Entity.change_or_create(
                    id_persistent=id_entity_persistent,
                    time_edit=time_add,
                    display_txt=display_txt,
                    version=None,
                    contribution_candidate=contribution,
                )
                entity.save()
                for idx_in_file, tag_definition in column_assignments:
                    id_tag_instance_persistent = str(uuid4())
                    value = str(row_tpl[int(idx_in_file)])
                    if value == "nan" or value == "" or value.isspace():
                        continue
                    tag_instance, _ = TagInstanceHistory.change_or_create(
                        id_persistent=id_tag_instance_persistent,
                        id_entity_persistent=id_entity_persistent,
                        id_tag_definition_persistent=tag_definition.id_persistent,
                        user=contribution.created_by,
                        time_edit=time_add,
                        value=value,
                    )
                    tag_instance.save()
            for origin, destination in tag_definition_pairs:
                TagMergeRequest(
                    id_persistent=uuid4(),
                    id_origin_persistent=origin.id_persistent,
                    id_destination_persistent=destination.id_persistent,
                    created_by=origin.owner,
                    assigned_to=destination.owner,
                    created_at=time_add,
                    contribution_candidate=contribution,
                ).save()
            contribution.set_state(ContributionCandidate.VALUES_EXTRACTED)
            contribution.save()
    except (  # pylint: disable=broad-except
        ContributionCandidate.MissingRequiredAssignmentsException,
        Exception,
    ) as exc:
        logging.error(None, exc_info=exc)
        with transaction.atomic():
            contribution_candidate = contribution_query.get()
            contribution_candidate.set_state(
                ContributionCandidate.COLUMNS_EXTRACTED,
                "Error during ingestion of assigned tags.",
                exc,
            )
            contribution_candidate.save()
