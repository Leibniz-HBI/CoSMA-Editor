"""Registry for CoSMA-Editor urls."""
from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from cosmae.person.api import router as person_router
from cosmae.tag.api import router as tag_router

ninja_api = NinjaAPI()
ninja_api.add_router("persons", person_router)
ninja_api.add_router("tags", tag_router)

urlpatterns = [path("manage/", admin.site.urls), path("api/", ninja_api.urls)]
