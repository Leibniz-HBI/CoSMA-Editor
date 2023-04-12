"Combination of tag defintions and instance API."
from cosmae.tag.api.definitions import router as defintions_router
from cosmae.tag.api.instances import router
from cosmae.util.auth import cosmae_auth

router.add_router("definitions", defintions_router, auth=cosmae_auth)

