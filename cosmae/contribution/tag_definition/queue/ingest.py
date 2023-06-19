"Queue job for ingesting data after columns have been assigned."
from datetime import datetime
from uuid import uuid4

from django.db import transaction
from django.db.utils import OperationalError

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import TagDefinitionContribution
from cosmae.contribution.tag_definition.queue.util import read_csv_of_candidate
from cosmae.person.models_django import Person
from cosmae.tag.models_django import TagDefinition, TagInstance


def ingest_values_from_csv(id_contribution_persistent):
    # pylint: disable=too-many-locals
    "Reads values from a csv files according to column assignments of a contribution candidate"

    contribution_query = ContributionCandidate.objects.select_for_update().filter(  # pylint: disable=no-member
        id_persistent=id_contribution_persistent
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
            display_txt_idx = None
            column_assignments = []
            for column_assignment in active_columns:
                if column_assignment.id_existing_persistent == "display_txt":
                    display_txt_idx = column_assignment.index_in_file
                else:
                    tag_definition = TagDefinition.most_recent_by_id(
                        column_assignment.id_existing_persistent
                    )
                    column_assignments.append(
                        (column_assignment.index_in_file, tag_definition)
                    )
            if display_txt_idx is None:
                raise ContributionCandidate.MissingRequiredAssignmentsException(
                    ["display_txt"]
                )
            data_frame = read_csv_of_candidate(contribution)
            time_add = datetime.now()
            for row_tpl in data_frame.itertuples(index=False):
                display_txt = row_tpl[display_txt_idx]
                id_entity_persistent = str(uuid4())
                entity, _ = Person.change_or_create(
                    id_persistent=id_entity_persistent,
                    time_edit=time_add,
                    display_txt=display_txt,
                    names_personal=display_txt,
                    version=None,
                )
                entity.save()
                for idx_in_file, tag_definition in column_assignments:
                    id_tag_instance_persistent = str(uuid4())
                    value = str(row_tpl[int(idx_in_file)])
                    if value == "nan":
                        continue
                    tag_instance, _ = TagInstance.change_or_create(
                        id_persistent=id_tag_instance_persistent,
                        id_entity_persistent=id_entity_persistent,
                        id_tag_definition_persistent=tag_definition.id_persistent,
                        time_edit=time_add,
                        value=value,
                    )
                    tag_instance.save()
            contribution.state = ContributionCandidate.MERGED
            contribution.save()
    except (  # pylint: disable=broad-except
        ContributionCandidate.MissingRequiredAssignmentsException,
        Exception,
    ):
        contribution_candidate = contribution_query.get()
        contribution_candidate.state = ContributionCandidate.COLUMNS_EXTRACTED
        contribution_candidate.save()
