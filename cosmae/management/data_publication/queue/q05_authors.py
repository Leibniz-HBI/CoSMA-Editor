"Collect individual author credits for a data publication."

from logging import getLogger

from django.db import transaction

from cosmae.edit_session.models_django import EditSessionParticipant
from cosmae.management.data_publication.models_django import (
    DataPublication,
    DataPublicationStepInput,
)
from cosmae.management.data_publication.queue.utils import (
    check_publication_and_set_working,
    process_data_publication_error,
)
from cosmae.util import CosmaeUser

_LOGGER = getLogger(__name__)


def collect_authors_credits(id_publication):
    "Collect individual author credits"
    publication_query = DataPublication.objects.filter(id_persistent=id_publication)
    publication = check_publication_and_set_working(
        publication_query, DataPublication.Step.AUTHORS
    )
    if publication is None:
        return
    try:
        inputs = DataPublicationStepInput.objects.filter(  # pylint: disable=no-member
            publication=publication, step=DataPublication.Step.AUTHORS
        ).first()
        if inputs is None:
            msg = "Could not find authors step input."
            process_data_publication_error(publication, _LOGGER, msg, "")
            return
        credits_by_session_id = inputs.input.get("credits", {})
        authors_cache = {}
        credits_by_author_id = {"overall": {}}
        for category in [
            "column_curated",
            "column_user",
            "display_txt",
            "justification",
        ]:
            category_credits_by_session_id = credits_by_session_id.get(category, {})
            credits_by_author_id[category] = {}
            for id_session, credit_count in category_credits_by_session_id.items():
                for author in get_authors_for_session(id_session, authors_cache):
                    add_author_credit(
                        credits_by_author_id[category], author, credit_count
                    )
                    add_author_credit(
                        credits_by_author_id["overall"], author, credit_count
                    )
            credits_by_author_id[category] = sort_credits_by_count(
                credits_by_author_id[category]
            )
        credits_by_author_id["overall"] = sort_credits_by_count(
            credits_by_author_id["overall"]
        )
        with transaction.atomic():
            DataPublicationStepInput.objects.create(  # pylint: disable=no-member
                publication=publication,
                step=DataPublication.Step.PROCESSING_COMPLETED,
                input={
                    "credits": credits_by_author_id,
                    "metadata": inputs.input.get("metadata", {}),
                },
            )
            publication.step = DataPublication.Step.PROCESSING_COMPLETED
            publication.is_working = False
            publication.save()

    except (Exception,) as exc:  # pylint: disable=broad-except
        msg = "Could not collect authors credits."
        process_data_publication_error(publication, _LOGGER, msg, str(exc))


def get_authors_for_session(id_session, authors_cache):
    "Get the list of authors for the given edit session id."
    try:
        return authors_cache[id_session]
    except KeyError:
        participant_list = list(
            EditSessionParticipant.objects.filter(edit_session_id=id_session)
        )
        # Fallback for justifications
        if len(participant_list) > 0:
            author_list = []
            for participant in participant_list:
                if participant.type_participant == EditSessionParticipant.INTERNAL:
                    try:
                        user = CosmaeUser.objects.filter(
                            id_persistent=participant.id_participant
                        ).get()
                        user_name = user.get_full_name()
                        additional_info = {"orcid": None, "email": user.email}
                    except CosmaeUser.DoesNotExist:
                        user_name = "Unknown Internal User"
                        additional_info = {"orcid": None, "email": None}
                else:
                    user_name = participant.name_participant
                    additional_info = {
                        "orcid": participant.id_participant,
                        "email": None,
                    }
                author_list.append(
                    {
                        "name": user_name,
                        "id": f"{participant.type_participant}:{participant.id_participant}",
                        **additional_info,
                    }
                )
        else:
            author = CosmaeUser.objects.get(id_persistent=id_session)
            author_list = [
                {
                    "name": author.get_full_name(),
                    "id": f"INT:{author.id_persistent}",
                    "email": author.email,
                    "orcid": None,
                }
            ]
        authors_cache[id_session] = author_list
        return author_list


def add_author_credit(credits_by_author_id, author, credit_count):
    "Add credits to an author in the given credits_by_author_id dict."

    author_key = author["id"]
    try:
        credits_by_author_id[author_key]["credits"] += credit_count
    except KeyError:
        credits_by_author_id[author_key] = {
            "name": author["name"],
            "credits": credit_count,
            "email": author.get("email"),
            "orcid": author.get("orcid"),
        }


def _credits_sort_key(item):
    return item["credits"]


def sort_credits_by_count(credits_by_author_id):
    "Return a list of authors sorted by credit count descending."
    return sorted(
        credits_by_author_id.values(),
        key=_credits_sort_key,
        reverse=True,
    )
