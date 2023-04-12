"Selects different settings dependent on environment variables."
from os import environ

try:
    import dotenv

    dotenv.load_dotenv(dotenv.find_dotenv())
except ImportError:
    pass

if environ.get("COSMAE_DEBUG").lower() == "true":
    from django_project.settings.settings_test import *
else:
    from django_project.settings.settings_production import *
