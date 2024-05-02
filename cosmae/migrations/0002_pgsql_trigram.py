"Migration to enable the postgres trigram  and unaccent extensions"
from django.contrib.postgres.operations import (
    BtreeGistExtension,
    TrigramExtension,
    UnaccentExtension,
)
from django.db import migrations


class Migration(migrations.Migration):
    "Migration to enable the postgres trigram  and unaccent extensions"
    dependencies = [("cosmae", "0001_initial")]

    operations = [TrigramExtension(), UnaccentExtension(), BtreeGistExtension()]
