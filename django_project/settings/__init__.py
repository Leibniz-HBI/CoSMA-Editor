"Selects different settings dependent on environment variables."

from os import environ

try:
    import dotenv

    dotenv.load_dotenv(dotenv.find_dotenv())
except ImportError:
    pass

if (
    environ.get("COSMAE_CI", "false").lower() == "false"
    and environ.get("COSMAE_DEBUG", "false").lower() == "false"
):
    from django_project.settings.settings_production import *
