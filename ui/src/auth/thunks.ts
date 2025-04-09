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
    postReauthenticateStart,
    postReauthenticateSuccess,
    postEmailVerificationStart,
    postEmailVerificationSuccess,
    postEmailVerificationError
} from './slice'
import { EmailAllauth, UserAllAuth } from './state'
import { handleAllauthResponse } from '../util/api'

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
                    const user = parseUserAllauthFromJson(json['user'])
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
                    const authUser = parseUserAllauthFromJson(userJson)
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

export function createUserThunk({
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
            const body: { [key: string]: string } = {
                username,
                email,
                password,
                names_personal: namesPersonal
            }
            if (namesFamily !== undefined && namesFamily.length > 0) {
                body['namesFamily'] = namesFamily
            }
            const rsp = await fetch(config.api_path + '/manage/user', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(body)
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
            handleAllauthResponse(
                dispatch,
                (dispatch, json) => {
                    dispatch(getSelfSuccess(parseUserInfoFromJson(json)))
                    dispatch(
                        setCurrentEditSession(
                            parseEditSessionFromApi(json['edit_session'])
                        )
                    )
                },
                json
            )
            dispatch(authStepEnd())
        } catch (e: unknown) {
            dispatch(authStepEnd())
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

export function postReauthenticateMfaThunk(code: string): ThunkWithFetch<void> {
    return postTotpCode('/auth/2fa/reauthenticate', code)
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
                        dispatch(setAuthUser(parseUserAllauthFromJson(user)))
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
                credentials: 'include',
                headers: mkPostHeaders()
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

export function postEmailVerificationThunk(key: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            dispatch(postEmailVerificationStart())
            await fetch(config.api_path_auth + '/config')
            const rsp = await fetch(config.api_path_auth + '/auth/email/verify', {
                method: 'POST',
                body: JSON.stringify({ key }),
                headers: mkPostHeaders(),
                credentials: 'include'
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('Email successfully verified'))
                    dispatch(postEmailVerificationSuccess())
                },
                json
            )
            // When there is no bad request, confirmation was successful
            if (rsp.status == 401) {
                dispatch(addSuccessVanish('Email successfully verified'))
                dispatch(postEmailVerificationSuccess())
            } else if (rsp.status == 400) {
                dispatch(postEmailVerificationError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(postEmailVerificationError())
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUserAllauthFromJson(userJson: any): UserAllAuth {
    return {
        display: userJson['display'] ?? undefined,
        email: userJson['email'] ?? undefined,
        id: userJson['id'],
        username: userJson['username']
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEmailAllauthFromJson(emailJson: any): EmailAllauth {
    return {
        email: emailJson['email'],
        verified: emailJson['verified'],
        primary: emailJson['primary']
    }
}
