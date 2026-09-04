import { cosmaeUserApiDeleteUser2Fa } from '../../openapi/cosmae'
import { errorMessageFromApi, exceptionMessage } from '../../util/exception'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import { ThunkWithFetch } from '../../util/type'

export function delete2FAThunk(idUserPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeUserApiDeleteUser2Fa({
                path: { id_user_persistent: idUserPersistent }
            })
            if (rsp.error) {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            } else {
                dispatch(addSuccessVanish('2FA removed for user.'))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
