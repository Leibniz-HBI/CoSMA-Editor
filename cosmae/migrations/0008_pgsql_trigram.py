"Migration to enable the postgres trigram  and unaccent extensions"
from django.contrib.postgres.operations import (
    BtreeGistExtension,
    TrigramExtension,
    UnaccentExtension,
)
from django.db import migrations


class Migration(migrations.Migration):
    "Migration to enable the postgres trigram  and unaccent extensions"
    dependencies = [("cosmae", "0007_delete_person_remove_entity_names_family_and_more")]

    operations = [TrigramExtension(), UnaccentExtension(), BtreeGistExtension()]
