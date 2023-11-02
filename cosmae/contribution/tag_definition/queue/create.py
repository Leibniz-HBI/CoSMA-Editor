"Queue jobs for creating contribution candidates."
import logging
from uuid import uuid4

from django.db import transaction

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution,
    TagInstanceContribution,
)
from cosmae.contribution.tag_definition.queue.util import read_csv_of_candidate


def read_csv_head(id_contribution_persistent):
    "extract tags from csv file"
    # Need to wait until processing of candidate is finished.
    contribution_query = ContributionCandidate.objects.select_for_update().filter(  # pylint: disable=no-member
        id_persistent=id_contribution_persistent
    )
    with transaction.atomic():
        try:
            contribution = contribution_query.get()
            TagDefinitionContribution.objects.filter(  # pylint: disable=no-member
                contribution_candidate=contribution
            ).delete()
            # set state correctly
            if contribution.state != ContributionCandidate.UPLOADED:
                return
            # start extracting tags
            data_frame = read_csv_of_candidate(contribution, nrows=10)
            definitions = []
            for idx, series_name in enumerate(data_frame):
                uuid = str(uuid4())
                tag_definition = TagDefinitionContribution.objects.create(  # pylint: disable=no-member
                    name=series_name,
                    id_persistent=uuid,
                    contribution_candidate=contribution,
                    index_in_file=idx,
                )
                definitions.append(tag_definition)
                for idx, val in enumerate(data_frame[series_name]):
                    TagInstanceContribution.objects.create(  # pylint: disable=no-member
                        value=str(val), tag_definition=tag_definition, line_idx=idx
                    )
            contribution.set_state(ContributionCandidate.COLUMNS_EXTRACTED)
            contribution.save()
        except Exception as exc:  # pylint: disable=broad-except
            with transaction.atomic():
                logging.warning("", exc_info=exc)
                contribution = contribution_query.get()
                contribution.set_state(
                    ContributionCandidate.UPLOADED,
                    "Error while extracting columns.",
                    exc,
                )
                contribution.save()
