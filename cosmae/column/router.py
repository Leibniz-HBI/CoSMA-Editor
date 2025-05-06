"Combination of column and column permissions APIs."

from cosmae.column.api import router
from cosmae.column.api_permissions import router as permissions_router
from cosmae.util.auth import cosmae_auth

router.add_router("permissions", permissions_router, auth=cosmae_auth)
