"Fixtures for data publication tests."

from pytest import fixture

import tests.management.data_publication.common as c
from cosmae.management.data_publication.models_django import DataPublication


@fixture()
def publication_created():
    "Freshly created data publication."
    return DataPublication.objects.create(
        name=c.created_name,
        start_time=c.created_start_date,
        end_time=c.created_end_date,
        id_persistent=c.created_id_persistent,
    )


@fixture()
def publication_working():
    "Data publication that is currently being worked on."
    return DataPublication.objects.create(
        name=c.working_name,
        start_time=c.working_start_date,
        end_time=c.working_end_date,
        id_persistent=c.working_id_persistent,
        is_working=True,
    )
