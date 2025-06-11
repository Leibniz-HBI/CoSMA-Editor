"Combine user routers"

from cosmae.user.api import router
from cosmae.user.ssh.api import router as ssh_router

router.add_router("ssh", ssh_router)
