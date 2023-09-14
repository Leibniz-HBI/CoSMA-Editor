"Combination of tag definitions and instance API."
from cosmae.tag.api.definitions import router as definitions_router
from cosmae.tag.api.instances import router
from cosmae.tag.api.permissions import router as permissions_router
from cosmae.util.auth import cosmae_auth

definitions_router.add_router("permissions", permissions_router, auth=cosmae_auth)
router.add_router("definitions", definitions_router, auth=cosmae_auth)
