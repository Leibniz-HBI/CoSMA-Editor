"Queue methods for removing duplicates of a contribution candidate."

import logging
from uuid import uuid4

import django_rq
from django.db import models, transaction
from django.db.models import OuterRef, Subquery
from django.db.utils import OperationalError

from cosmae.contribution.entity.models_django import EntityDuplicate
from cosmae.contribution.models_django import ContributionCandidate
from cosmae.entity.models_django import EntityHistory, EntityJustification
from cosmae.entity.queue import update_display_txt_cache
from cosmae.merge_request.queue import merge_request_fast_forward
from cosmae.util import timestamp
from cosmae.value.models_django import Value, ValueHistory


class MissingJustificationException(Exception):
    "Exception indicating that no justification was provided."

    def __init__(self, *args: object) -> None:
        super().__init__("Justification missing for at least one entity.", *args)


def eliminate_duplicates(id_contribution_persistent):
    "Eliminate all marked duplicate entities for a contribution candidate"
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
            time_edit = timestamp()
            duplicates = EntityDuplicate.objects.filter(  # pylint: disable=no-member
                contribution_candidate=contribution
            )
            values_with_duplicates = annotate_with_replacement_info(
                Value.objects.all(),  # pylint: disable=no-member
                duplicates,
                "id_entity_persistent",
            )
            update_values(values_with_duplicates, contribution.created_by, time_edit)

            replaced_entities_with_duplicates = annotate_with_replacement_info(
                EntityHistory.objects.filter(  # pylint: disable=no-member
                    contribution_candidate=contribution
                ),
                duplicates,
                "id_persistent",
            )
            update_entities(replaced_entities_with_duplicates, contribution, time_edit)
            for merge_request in contribution.columnmergerequest_set.all():
                django_rq.enqueue(
                    merge_request_fast_forward,
                    merge_request.id_persistent,
                )
            contribution.set_state(ContributionCandidate.MERGED)
            contribution.save()
    except Exception as exc:  # pylint: disable=broad-except
        logging.warning(None, exc_info=exc)
        with transaction.atomic():
            contribution_candidate = contribution_query.get()
            contribution_candidate.set_state(
                ContributionCandidate.VALUES_EXTRACTED,
                error_msg="Error during Entity Duplicate Elimination.",
                exception=exc,
            )
            contribution_candidate.save()


def update_values(values_with_duplicates, user, time_edit):
    "Update values according to replacement info."
    # no good way to keep track of updates in bulk operation for now
    values_with_duplicates = values_with_duplicates.filter(
        replacement_id_entity_persistent__isnull=False
    )
    updated_values = [
        ValueHistory.change_or_create_versioned(
            id_persistent=value.id_persistent,
            id_entity_persistent=value.replacement_id_entity_persistent,
            value=value.value,
            id_column_persistent=value.id_column_persistent,
            written_by_session=user.edit_session,
            version=value.id,
            time_edit=time_edit,
        )[0]
        for value in values_with_duplicates
    ]
    ValueHistory.objects.bulk_create(updated_values)  # pylint: disable=no-member
    for value in updated_values:
        django_rq.enqueue(update_display_txt_cache, value.id_entity_persistent)


def annotate_with_replacement_info(manager, replacements, id_entity_field_name):
    "Annotate DB objects with replacement information."
    replacements_subquery = replacements.filter(
        id_origin_persistent=OuterRef(id_entity_field_name)
    )
    return manager.annotate(  # pylint: disable=no-member
        replacement_id_entity_persistent=Subquery(
            replacements_subquery.values("id_destination_persistent")
        ),
        replacement_discard=Subquery(replacements_subquery.values("discard")),
    )


def update_entities(
    entities_with_replacement_info, contribution: ContributionCandidate, time_edit
):
    """Update entities according to replacement info:
    Replaced entities will be deleted and
    others will be made full entities by removing the contribution_candidate."""
    # In the future the entities may just be disabled.
    for_deletion = entities_with_replacement_info.filter(
        replacement_id_entity_persistent__isnull=False, replacement_discard=False
    )
    for entity in for_deletion:
        EntityJustification.copy(
            entity.id_persistent, entity.replacement_id_entity_persistent
        )
    EntityHistory.objects.filter(
        id_persistent__in=for_deletion.values("id_persistent")
    ).delete()
    id_entity_discarded = EntityHistory.objects.filter(
        id_persistent__in=entities_with_replacement_info.filter(
            replacement_discard=True
        ).values("id_persistent")
    )
    ValueHistory.objects.filter(
        id_entity_persistent__in=id_entity_discarded.values("id_persistent")
    ).delete()
    id_entity_discarded.delete()
    new_entities = entities_with_replacement_info.filter(
        replacement_id_entity_persistent__isnull=True, replacement_discard__isnull=True
    )
    missing_justification = new_entities.annotate(
        justification=models.Subquery(
            EntityJustification.objects.filter(  # pylint: disable=no-member
                id_entity_persistent=models.OuterRef("id_persistent")
            ).values("text")
        )
    ).filter(justification__isnull=True)
    if len(missing_justification) > 0:
        if contribution.justification is None:
            raise MissingJustificationException()
        for entity in missing_justification:
            EntityJustification.add(
                id_persistent=uuid4(),
                id_entity_persistent=entity.id_persistent,
                text=contribution.justification,
                author=contribution.created_by,
                timestamp=time_edit,
            )

    new_entities.update(contribution_candidate=None)
