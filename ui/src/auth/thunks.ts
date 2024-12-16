import { config } from '../config'
import { setCurrentEditSession } from '../session/slice'
import { parseEditSessionFromApi } from '../session/thunks'
import { AppDispatch } from '../store'
import { parseUserInfoFromJson } from '../user/thunks'
import { getCookie } from '../util/cookie'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { ACCEPT_JSON_HEADER } from '../util/fetch'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    authStepEnd,
    getConfigStart,
    getConfigSuccess,
    getSelfEnd,
    getSelfStart,
    getSelfSuccess,
    getSessionStart,
    redirectStart,
    setAuthUser
} from './slice'
import { SsoProvider, UserAllAuth } from './state'

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
            console.log(rsp)
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
            }
        // eslint-disable-next-line no-empty
        } catch (_e: unknown) {}
        dispatch(authStepEnd())
        return false
    }
}

export function getConfigThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getConfigStart())
        try {
            const rsp = await fetch(config.api_path_auth + '/config')
            const json = await rsp.json()
            if (rsp.status == 200) {
                const providers = json['data']['socialaccount']['providers'].map(
                    (providerJson: unknown) => parseSsoProviderFromJson(providerJson)
                )
                dispatch(getConfigSuccess(providers))
            } else {
                dispatch(authStepEnd())
                const apiMsg = errorMessageFromApi(json)
                if (apiMsg !== 'Not authenticated') {
                    dispatch(addError(apiMsg))
                }
            }
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function redirectThunk(provider: string): ThunkWithFetch<string | undefined> {
    return async (dispatch, _getState, fetch) => {
        dispatch(redirectStart())
        try {
            const csrftoken = getCookie('csrftoken')
            const data = new URLSearchParams()
            data.append('provider', provider)
            data.append('process', 'login')
            data.append('callback_url', '/callback')
            if (csrftoken !== undefined) {
                data.append('csrfmiddlewaretoken', csrftoken)
            }
            const rsp = await fetch(config.api_path_auth + '/auth/provider/redirect', {
                method: 'POST',
                body: data,
                credentials: 'include'
            })
            if (rsp.status == 200) {
                dispatch(authStepEnd())
                return rsp.url
            } else {
                dispatch(addError('Could not perform login redirect.'))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(authStepEnd)
        }
        return undefined
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSsoProviderFromJson(providerJson: any): SsoProvider {
    return {
        id: providerJson['id'],
        name: providerJson['name'],
        flows: providerJson['flows']
    }
}
