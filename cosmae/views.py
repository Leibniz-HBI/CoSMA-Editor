"""Views for the CoSMA-Editor Django app."""
from django.http import HttpResponse


def index(_):
    """Test request for CoSMA-Editor."""
    return HttpResponse("Hello, CoSMA-E.")
