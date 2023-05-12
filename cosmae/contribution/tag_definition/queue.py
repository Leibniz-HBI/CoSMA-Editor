"Queue jobs for processing contribution candidates."
from os.path import join
from uuid import uuid4

import django_rq
from django.conf import settings
from django.db import transaction
from django.db.utils import OperationalError
from pandas import read_csv

from cosmae.contribution.models_django import ContributionCandidate
from cosmae.contribution.tag_definition.models_django import (
    TagDefinitionContribution,
    TagInstanceContribution,
)


def mk_extract_tags_group_name(contribution: ContributionCandidate):
    "Create a group name for extracting csvs."
    return "extract_tags_" + str(contribution.id_persistent)


def read_csv_head(id_contribution_persistent):
    "extract tags from csv file"
    # Need to wait until processing of candidate is finished.
    contribution_query = ContributionCandidate.objects.select_for_update().filter(  # pylint: disable=no-member
        id_persistent=id_contribution_persistent
    )
    with transaction.atomic():
        try:
            contribution = contribution_query.get()
        except OperationalError:
            return
        TagDefinitionContribution.objects.filter(  # pylint: disable=no-member
            contribution_candidate=contribution
        ).delete()
        # set state correctly
        if contribution.state != ContributionCandidate.UPLOADED:
            contribution.state = ContributionCandidate.UPLOADED
            contribution.save()
        # start extracting tags
        pth = join(settings.CONTRIBUTION_DIRECTORY, contribution.file_name)
        if contribution.has_header:
            header_param = 0
        else:
            header_param = None
        data_frame = read_csv(pth, header=header_param, nrows=10)
        definitions = []
        for idx, series_name in enumerate(data_frame):
            uuid = str(uuid4())
            tag_definition = (
                TagDefinitionContribution.objects.create(  # pylint: disable=no-member
                    name=series_name,
                    id_persistent=uuid,
                    contribution_candidate=contribution,
                    index_in_file=idx,
                )
            )
            definitions.append(tag_definition)
            for idx, val in enumerate(data_frame[series_name]):
                TagInstanceContribution.objects.create(  # pylint: disable=no-member
                    value=str(val), tag_definition=tag_definition, line_idx=idx
                )
        contribution.state = ContributionCandidate.COLUMNS_EXTRACTED
        contribution.save()


def dispatch_read_csv_head(
    sender,
    instance,
    created,
    update_fields,
    **kwargs  # pylint: disable=unused-argument
):
    "Queues the task for extracting tags from columns."
    if created or (update_fields and "has_header" in update_fields):
        django_rq.enqueue(read_csv_head, str(instance.id_persistent))
