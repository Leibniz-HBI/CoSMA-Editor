import { config } from '../config'
import { toDataURL } from 'qrcode'
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
    getTotpNotFound,
    getTotpStart,
    getTotpSuccess,
    getSelfEnd,
    getSelfStart,
    getSelfSuccess,
    getSessionEnd,
    getSessionStart,
    loginStart,
    registrationEnd,
    registrationStart,
    setAuthUser,
    postTotpCodeEnd,
    postTotpCodeStart,
    postTotpCodeSuccess,
    logoutStart,
    logoutSuccess,
    setReauthenticate,
    postReauthenticateStart,
    postReauthenticateSuccess
} from './slice'
import { UserAllAuth } from './state'

export function getSessionThunk(withDispatch: boolean): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        if (withDispatch) {
            dispatch(getSessionStart())
        }
        try {
            // get initial token
            await fetch(config.api_path_auth + '/config')
            const rsp = await fetch(config.api_path_auth + '/auth/session', {
                headers: ACCEPT_JSON_HEADER,
                credentials: 'include'
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, json) => {
                    const user = parseUserAllAuthFromJson(json['user'])
                    dispatch(setAuthUser(user))
                },
                json
            )
            return true
        } catch (_e: unknown) {
            dispatch(getSessionEnd())
            return false
        }
    }
}

export function loginThunk(username: string, password: string): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(loginStart())
        try {
            const headers: { [key: string]: string } = mkPostHeaders()
            const rsp = await fetch(config.api_path_auth + '/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ username, password })
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, json) => {
                    const userJson = json['user']
                    const authUser = parseUserAllAuthFromJson(userJson)
                    dispatch(setAuthUser(authUser))
                },
                json
            )
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

function mkPostHeaders() {
    const headers: { [key: string]: string } = {
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }
    const csrfmiddlewaretoken = getCookie('csrftoken')
    if (csrfmiddlewaretoken !== undefined) {
        headers['X-CSRFToken'] = csrfmiddlewaretoken
    }
    return headers
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
            const headers = mkPostHeaders()
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
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(registrationEnd())
                    dispatch(addSuccessVanish('Registration Successful'))
                },
                json
            )
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

export function getTotpThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            dispatch(getTotpStart())
            const rsp = await fetch(
                config.api_path_auth + '/account/authenticators/totp',
                { credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 404) {
                const totpUrlString = json['meta']['totp_url']
                const totpUrlQrCodeImageSource = await toDataURL(totpUrlString)

                dispatch(getTotpNotFound(totpUrlQrCodeImageSource))
            } else {
                handleAllauthResponse(
                    dispatch,
                    (dispatch, _json) => {
                        dispatch(getTotpSuccess())
                    },
                    json
                )
            }
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function postTotpAuthenticationThunk(code: string): ThunkWithFetch<void> {
    return postTotpCode('/auth/2fa/authenticate', code)
}

export function postActivateTotpThunk(code: string): ThunkWithFetch<void> {
    return postTotpCode('/account/authenticators/totp', code)
}

export function postTotpCode(apiSuffix: string, code: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            dispatch(postTotpCodeStart())
            const rsp = await fetch(config.api_path_auth + apiSuffix, {
                credentials: 'include',
                method: 'POST',
                headers: mkPostHeaders(),
                body: JSON.stringify({ code })
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, json) => {
                    const user = json['user']
                    if (user !== undefined) {
                        dispatch(setAuthUser(parseUserAllAuthFromJson(user)))
                    } else {
                        dispatch(postTotpCodeSuccess())
                    }
                },
                json
            )
        } catch (e: unknown) {
            dispatch(postTotpCodeEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function logoutThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            dispatch(logoutStart())
            const rsp = await fetch(config.api_path_auth + '/auth/session', {
                method: 'DELETE',
                credentials: 'include'
            })
            if (rsp.status != 401) {
                const json = await rsp.json()
                dispatch(addError(errorMessageFromApi(json)))
            }
            dispatch(logoutSuccess())
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function reauthenticateThunk(password: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            dispatch(postReauthenticateStart())
            const rsp = await fetch(config.api_path_auth + '/auth/reauthenticate', {
                method: 'POST',
                body: JSON.stringify({ password }),
                headers: mkPostHeaders()
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(postReauthenticateSuccess())
                },
                json
            )
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

function handleAllauthResponse(
    dispatch: AppDispatch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    successAction: (dispatch: AppDispatch, json: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: { [key: string]: any }
) {
    const status = json['status']
    const data = json['data']
    if (status == 200) {
        successAction(dispatch, data)
        return
    }
    const errors: { [key: string]: string }[] = json['errors']
    if (errors !== undefined && errors.length >0) {
        for (const error of errors) {
            dispatch(addError(error['message']))
        }
        dispatch(authStepEnd())
    }
    if (data === undefined) {
        return
    }
    const meta = json['meta']
    const flowList = data['flows']
    const availableFlows = new Set<string>()
    const pendingFlows = new Set<string>()
    for (const flow of flowList) {
        const flowId = flow['id']
        if (flow['is_pending']) {
            pendingFlows.add(flowId)
        }
        availableFlows.add(flowId)
    }
    if (status == 401) {
        const isAuthenticated = meta['is_authenticated']
        if (isAuthenticated) {
            if (availableFlows.has('reauthenticate')) {
                dispatch(setReauthenticate())
            }
        } else if (pendingFlows.has('mfa_authenticate')) {
            dispatch(getTotpSuccess())
        } else {
            dispatch(logoutSuccess())
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
