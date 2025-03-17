"Combine routers for management"

from ninja import Router

from cosmae.management.display_txt.api import router as display_txt_router
from cosmae.management.user.api import router as user_router

router = Router()
router.add_router("display_txt", display_txt_router)
router.add_router("user", user_router)
