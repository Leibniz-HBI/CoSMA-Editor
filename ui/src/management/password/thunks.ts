import { config } from "../../config"
import { handleAllauthResponse } from "../../util/api"
import { exceptionMessage } from "../../util/exception"
import { addError, addSuccessVanish } from "../../util/notification/slice"
import { ThunkWithFetch } from "../../util/type"

export function setPasswordThunk(
    idUserPersistent:string,
    newPassword: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(config.api_path + '/user/password', {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    id_user_persistent: idUserPersistent,
                    new_password: newPassword
                })
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('Password changed'))
                },
                json,
            )
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
