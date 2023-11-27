"Router combination for merge requests"
from cosmae.merge_request.api import router
from cosmae.merge_request.entity.api import router as entity_merge_request_router
from cosmae.util.auth import cosmae_auth

router.add_router("entities", entity_merge_request_router, auth=cosmae_auth)
