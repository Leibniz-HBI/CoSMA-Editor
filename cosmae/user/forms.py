"Form classes used in allauth flows."

from django import forms


class CosmaeSignupForm(forms.Form):
    "Additional form values for allauth signup"

    names_personal = forms.CharField(max_length=60)
    names_family = forms.CharField(max_length=60, empty_value=None, required=False)

    def signup(self, request, user):
        "Required function but noop because values already set in adapter."
