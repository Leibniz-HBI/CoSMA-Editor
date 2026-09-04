import { cosmaeUserSshApiPutSshKey } from '../../openapi/cosmae'
import { handleAllauthResponse } from '../../util/api'
import { exceptionMessage } from '../../util/exception'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import { ThunkWithFetch } from '../../util/type'

export function setSshKeyThunk(
    idUserPersistent: string,
    sshKey: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeUserSshApiPutSshKey({
                body: {
                    id_user_persistent: idUserPersistent,
                    key: sshKey
                }
            })
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('SSH Key added'))
                },
                rsp
            )
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
