import { config } from '../config'
import { setCurrentEditSession } from '../session/slice'
import { parseEditSessionFromApi } from '../session/thunks'
import { AppDispatch } from '../store'
import { parseUserInfoFromJson } from '../user/thunks'
import { getCookie } from '../util/cookie'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { ACCEPT_JSON_HEADER } from '../util/fetch'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    authStepEnd,
    getSelfEnd,
    getSelfStart,
    getSelfSuccess,
    getSessionEnd,
    getSessionStart,
    loginStart,
    registrationEnd,
    registrationStart,
    setAuthUser
} from './slice'
import { UserAllAuth } from './state'

export function getSessionThunk(withDispatch: boolean): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        if (withDispatch) {
            dispatch(getSessionStart())
        }
        try {
            const rsp = await fetch(config.api_path_auth + '/auth/session', {
                headers: ACCEPT_JSON_HEADER,
                credentials: 'include'
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                if (!json['meta']['is_authenticated']) {
                    dispatch(authStepEnd())
                    return false
                }
                // fields: 'data', 'meta', 'errors'
                // data fields: 'user', 'methods', 'flows'
                // meta fields: 'is_authenticated'
                const user = parseUserAllAuthFromJson(json['data']['user'])
                dispatch(setAuthUser(user))
                dispatch(authStepEnd())
                return true
            } else {
                // get initial token!
                await fetch(config.api_path_auth + '/config')
            }
            // eslint-disable-next-line no-empty
        } catch (_e: unknown) {}
        dispatch(getSessionEnd())
        return false
    }
}

export function loginThunk(username: string, password: string): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(loginStart())
        try {
            const headers: { [key: string]: string } = {
                'Access-Control-Allow-Credentials': 'true',
                'Content-Type': 'application/json'
            }
            const csrfmiddlewaretoken = getCookie('csrftoken')
            if (csrfmiddlewaretoken !== undefined) {
                headers['X-CSRFToken'] = csrfmiddlewaretoken
            }
            const rsp = await fetch(config.api_path_auth + '/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ username, password })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const userJson = json['data']['user']
                const authUser = parseUserAllAuthFromJson(userJson)
                dispatch(setAuthUser(authUser))
            } else {
                const json = await rsp.json()
                let msg = json['msg']
                if (msg === undefined) {
                    msg = 'Unknown error'
                }
                dispatch(authStepEnd())
                dispatch(addError(msg))
            }
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function registerThunk({
    username,
    namesPersonal,
    namesFamily,
    email,
    password
}: {
    username: string
    namesPersonal: string
    namesFamily?: string
    email: string
    password: string
}): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(registrationStart())
        try {
            const headers: { [key: string]: string } = {
                'Access-Control-Allow-Credentials': 'true',
                'Content-Type': 'application/json'
            }
            const csrfmiddlewaretoken = getCookie('csrftoken')
            if (csrfmiddlewaretoken !== undefined) {
                headers['X-CSRFToken'] = csrfmiddlewaretoken
            }
            console.log(csrfmiddlewaretoken)
            const rsp = await fetch(config.api_path_auth + '/auth/signup', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    names_personal: namesPersonal,
                    names_family: namesFamily
                })
            })
            if (rsp.status == 200) {
                dispatch(registrationEnd())
                dispatch(addSuccessVanish('Registration Successful'))
            } else {
                const json = await rsp.json()
                let msg = ''
                if (rsp.status == 422) {
                    errorMessageFromApi(json)
                } else {
                    msg = json['msg']
                    if (msg === undefined) {
                        msg = 'Unknown error'
                    }
                }
                dispatch(registrationEnd())
                dispatch(addError(msg))
            }
        } catch (error: unknown) {
            dispatch(registrationEnd())
            dispatch(addError(exceptionMessage(error)))
        }
    }
}

export function getSelfThunk(): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(getSelfStart())
        try {
            const rsp = await fetch(config.api_path + '/user/self', {
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const msg = json['msg']
                if (msg !== undefined) {
                    dispatch(getSelfEnd())
                    dispatch(addError(errorMessageFromApi(json)))
                } else {
                    dispatch(getSelfSuccess(parseUserInfoFromJson(json)))
                    dispatch(
                        setCurrentEditSession(
                            parseEditSessionFromApi(json['edit_session'])
                        )
                    )
                }
            } else {
                let msg = json['msg']
                if (msg === undefined) {
                    msg = 'Unknown error'
                }
                dispatch(getSelfEnd())
                if (msg !== 'Not authenticated') {
                    dispatch(addError(msg))
                }
            }
        } catch (e: unknown) {
            dispatch(getSelfEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUserAllAuthFromJson(userJson: any): UserAllAuth {
    return {
        display: userJson['display'] ?? undefined,
        email: userJson['email'] ?? undefined,
        id: userJson['id'],
        username: userJson['username']
    }
}
