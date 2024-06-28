"Queue job for ingesting data after columns have been assigned."

import logging
from datetime import datetime
from typing import List, Set, Tuple
from uuid import uuid4

from django.db import transaction
from django.db.utils import OperationalError

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.contribution.tag_definition.queue.util import read_csv_of_candidate
from cosmae.entity.models_django import Entity, EntityJustification
from cosmae.exception import TagDefinitionExistsException
from cosmae.merge_request.models_django import TagMergeRequest
from cosmae.tag.models_django import (
    TagDefinition,
    TagDefinitionHistory,
    TagInstanceHistory,
)
from cosmae.util import CosmaeUser, timestamp


def mk_display_txt_extractor(idx):
    """Create a function to read the display text from csv rows.
    If the index is None a function always returning None is the result of this function.
    """
    if idx is None:
        return lambda _: None
    return lambda row_tpl: row_tpl[idx]


def mk_justification_strategy(idx, time_edit: datetime, user: CosmaeUser):
    """Create a function that handles justifications.
    Will do nothing if the index is None."""
    if idx is None:
        return (
            lambda id_entity_persistent, row_tpl: None
        )  # pylint: disable=unused-argument # for common type with actual strategy

    def justification_strategy(id_entity_persistent, row_tpl):
        try:
            EntityJustification.add(
                id_entity_persistent=id_entity_persistent,
                id_persistent=uuid4(),
                text=row_tpl[idx],
                timestamp=time_edit,
                author=user,
            )
        except EntityJustification.EmptyJustificationException:
            pass
        except AttributeError:
            pass

    return justification_strategy


def is_value_empty(value: str, empty_strings: Set[str]):
    "check whether a value is empty"
    return (
        len(value) == 0
        or value == "None"
        or value.isspace()
        or value.lower() in empty_strings
    )


def is_row_empty(
    display_txt,
    row_tpl,
    column_assignment: List[Tuple[int, TagDefinition]],
    empty_strings: Set[str],
):
    "Check if the entries of a row are empty for a given column assignment."
    if not (display_txt is None or is_value_empty(display_txt, empty_strings)):
        return False
    for idx, _ in column_assignment:
        val = row_tpl[idx]
        if val is None:
            continue
        if is_value_empty(str(val), empty_strings):
            continue
        return False
    return True


def ingest_values_from_csv(id_contribution_persistent):
    # pylint: disable=too-many-locals,too-many-branches,too-many-statements
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
            time_add = timestamp()
            display_txt_idx = None
            justification_idx = None
            column_assignments = []
            tag_definition_pairs = []
            empty_strings = {
                empty.lower().strip() for empty in contribution.empty_values.split(",")
            }
            for column_assignment in active_columns:
                if column_assignment.id_existing_persistent == "display_txt":
                    display_txt_idx = column_assignment.index_in_file
                elif column_assignment.id_existing_persistent == "justification":
                    justification_idx = column_assignment.index_in_file
                else:
                    tag_definition_destination = TagDefinition.most_recent_by_id(
                        column_assignment.id_existing_persistent
                    )
                    merge_request_base_name = (
                        tag_definition_destination.name
                        + " Merge Request "
                        + contribution.name
                    )
                    merge_request_name = merge_request_base_name
                    tag_definition_origin = None
                    id_tag_definition_origin_persistent = str(uuid4())
                    # loop is for fallback in case the tag definition already exists
                    for idx in range(1, 10):
                        try:
                            (
                                tag_definition_origin,
                                _,
                            ) = TagDefinitionHistory.change_or_create_versioned(
                                id_persistent=id_tag_definition_origin_persistent,
                                name=merge_request_name,
                                written_by_id_persistent=contribution.created_by.id_persistent,
                                id_parent_persistent=tag_definition_destination.id_persistent,
                                type=tag_definition_destination.type,
                                time_edit=time_add,
                                owner=contribution.created_by,
                            )
                            tag_definition_origin.save()
                            break
                        except TagDefinitionExistsException:
                            tag_definition_origin = None
                            merge_request_name = merge_request_base_name + f" {idx}"
                    if tag_definition_origin is None:
                        raise TagDefinitionExistsException(
                            merge_request_name,
                            id_tag_definition_origin_persistent,
                            tag_definition_destination.id_parent_persistent,
                        )
                    column_assignments.append(
                        (column_assignment.index_in_file, tag_definition_origin)
                    )
                    tag_definition_pairs.append(
                        (tag_definition_origin, tag_definition_destination)
                    )
            created_by = contribution.created_by
            display_txt_extractor = mk_display_txt_extractor(display_txt_idx)
            justification_strategy = mk_justification_strategy(
                justification_idx, time_add, user=created_by
            )
            data_frame = read_csv_of_candidate(contribution)
            for row_tpl in data_frame.itertuples(index=False):
                display_txt = display_txt_extractor(row_tpl)
                if is_row_empty(
                    display_txt,
                    row_tpl,
                    column_assignments,  # pylint: disable = undefined-loop-variable
                    empty_strings,
                ):
                    continue
                id_entity_persistent = str(uuid4())
                entity, _ = Entity.change_or_create_versioned(
                    id_persistent=id_entity_persistent,
                    time_edit=time_add,
                    written_by_id_persistent=created_by.id_persistent,
                    display_txt=display_txt,
                    version=None,
                    contribution_candidate=contribution,
                )
                entity.save()
                justification_strategy(id_entity_persistent, row_tpl)
                for idx_in_file, tag_definition in column_assignments:
                    id_tag_instance_persistent = str(uuid4())
                    value = str(row_tpl[int(idx_in_file)])
                    if is_value_empty(value, empty_strings):
                        continue
                    tag_instance, _ = TagInstanceHistory.change_or_create_versioned(
                        id_persistent=id_tag_instance_persistent,
                        id_entity_persistent=id_entity_persistent,
                        id_tag_definition_persistent=tag_definition.id_persistent,
                        written_by_id_persistent=created_by.id_persistent,
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
                    disable_origin_on_merge=True,
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
