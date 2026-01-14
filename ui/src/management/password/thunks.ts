import { cosmaeUserApiPostSetPasswordForUser } from '../../openapi/cosmae'
import { handleAllauthResponse } from '../../util/api'
import { exceptionMessage } from '../../util/exception'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import { ThunkWithFetch } from '../../util/type'

export function setPasswordThunk(
    idUserPersistent: string,
    newPassword: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeUserApiPostSetPasswordForUser({
                body: {
                    id_user_persistent: idUserPersistent,
                    new_password: newPassword
                }
            })
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('Password changed'))
                },
                rsp
            )
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
