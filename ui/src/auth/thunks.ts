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
import { handleAllauthResponseFromClient } from '../util/api'
import {
    getAllauthByClientV1AuthSession,
    getAllauthByClientV1Config,
    postAllauthByClientV1AuthLogin,
    postAllauthByClientV1Auth2FaAuthenticate,
    postAllauthByClientV1Auth2FaReauthenticate,
    postAllauthByClientV1AccountAuthenticatorsTotp,
    getAllauthByClientV1AccountAuthenticatorsTotp,
    deleteAllauthByClientV1AuthSession,
    postAllauthByClientV1AuthReauthenticate,
    postAllauthByClientV1AuthEmailVerify
} from '../openapi/allauth/sdk.gen'
import {
    cosmaeManagementUserApiPostCreateUser,
    cosmaeUserApiGetSelf
} from '../openapi/cosmae/sdk.gen'
import {
    AuthenticatedResponse,
    AuthenticationResponse,
    ConflictResponse,
    ErrorResponse,
    StatusOk,
    TotpAuthenticator
} from '../openapi/allauth'
import { RequestResult } from '../openapi/allauth/client'

export function getSessionThunk(withDispatch: boolean): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _api) => {
        if (withDispatch) {
            dispatch(getSessionStart())
        }
        try {
            // get initial token
            await getAllauthByClientV1Config({
                path,
                credentials: 'omit'
            })
            const rsp = await getAllauthByClientV1AuthSession({
                headers: ACCEPT_JSON_HEADER,
                path
            })
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, json) => {
                    const user = parseUserAllauthFromJson(json['user'])
                    dispatch(setAuthUser(user))
                },
                rsp
            )
            return true
        } catch (_e: unknown) {
            dispatch(getSessionEnd())
            return false
        }
    }
}

export function loginThunk(username: string, password: string): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, _fetch) => {
        dispatch(loginStart())
        try {
            const headers: { [key: string]: string } = mkPostHeaders()
            const rsp = await postAllauthByClientV1AuthLogin({
                headers,
                path,
                body: { username, password }
            })
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, json) => {
                    const userJson = json['user']
                    const authUser = parseUserAllauthFromJson(userJson)
                    dispatch(setAuthUser(authUser))
                },
                rsp
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
    password,
    sshKey
}: {
    username: string
    namesPersonal: string
    namesFamily?: string
    email: string
    password: string
    sshKey: string
}): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, _fetch) => {
        dispatch(registrationStart())
        try {
            const headers = mkPostHeaders()
            const body: { [key: string]: string } = {
                username,
                email,
                password,
                names_personal: namesPersonal,
                ssh_key: sshKey
            }
            if (namesFamily !== undefined && namesFamily.length > 0) {
                body['namesFamily'] = namesFamily
            }
            const rsp = await cosmaeManagementUserApiPostCreateUser({ body, headers })
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, _json) => {
                    dispatch(registrationEnd())
                    dispatch(addSuccessVanish('Registration Successful'))
                },
                rsp
            )
        } catch (error: unknown) {
            dispatch(registrationEnd())
            dispatch(addError(exceptionMessage(error)))
        }
    }
}

export function getSelfThunk(): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, _fetch) => {
        dispatch(getSelfStart())
        try {
            const rsp = await cosmaeUserApiGetSelf({
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            })
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, json) => {
                    dispatch(getSelfSuccess(parseUserInfoFromJson(json)))
                    dispatch(
                        setCurrentEditSession(
                            parseEditSessionFromApi(json['edit_session'])
                        )
                    )
                },
                rsp
            )
            dispatch(authStepEnd())
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getTotpThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            dispatch(getTotpStart())
            const rsp = await getAllauthByClientV1AccountAuthenticatorsTotp({ path })
            if (rsp.error?.status == 404) {
                const totpUrlString = rsp.error.meta.totp_url
                const totpUrlQrCodeImageSource = await toDataURL(totpUrlString)

                dispatch(getTotpNotFound(totpUrlQrCodeImageSource))
            } else {
                handleAllauthResponseFromClient(
                    dispatch,
                    (dispatch, _json) => {
                        dispatch(getTotpSuccess())
                    },
                    rsp
                )
            }
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

type TotpResponse<ThrowOnError extends boolean = false> = RequestResult<
    { 200: AuthenticatedResponse | { status: StatusOk; data: TotpAuthenticator } },
    | { 400: ErrorResponse; 401: AuthenticationResponse }
    | { 400: ErrorResponse }
    | { 400: ErrorResponse; 409: ConflictResponse },
    ThrowOnError,
    'fields'
>
const path: { client: 'browser' | 'app' } = { client: 'browser' }

export function postTotpAuthenticationThunk(code: string): ThunkWithFetch<void> {
    return postTotpCode(
        (code) =>
            postAllauthByClientV1Auth2FaAuthenticate({
                path,
                body: { code },
                headers: mkPostHeaders()
            }),
        code
    )
}

export function postActivateTotpThunk(code: string): ThunkWithFetch<void> {
    return postTotpCode(
        (code) =>
            postAllauthByClientV1AccountAuthenticatorsTotp({
                path,
                headers: mkPostHeaders(),
                body: { code }
            }),
        code
    )
}

export function postReauthenticateMfaThunk(code: string): ThunkWithFetch<void> {
    return postTotpCode(
        (_code) =>
            postAllauthByClientV1Auth2FaReauthenticate({
                path,
                headers: mkPostHeaders()
            }),
        code
    )
}

export function postTotpCode(
    totpPromise: (code: string) => TotpResponse,
    code: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            dispatch(postTotpCodeStart())
            const rsp = await totpPromise(code)
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, json) => {
                    const user = json['user']
                    if (user !== undefined) {
                        dispatch(setAuthUser(parseUserAllauthFromJson(user)))
                    } else {
                        dispatch(postTotpCodeSuccess())
                    }
                },
                rsp
            )
        } catch (e: unknown) {
            dispatch(postTotpCodeEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function logoutThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            dispatch(logoutStart())
            const rsp = await deleteAllauthByClientV1AuthSession({
                headers: mkPostHeaders(),
                path
            })
            if (rsp.error?.status != 401 && rsp.error !== undefined) {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
            dispatch(logoutSuccess())
        } catch (e: unknown) {
            dispatch(authStepEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function reauthenticateThunk(password: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            dispatch(postReauthenticateStart())
            const rsp = await postAllauthByClientV1AuthReauthenticate({
                path,
                body: { password }
            })
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, _json) => {
                    dispatch(postReauthenticateSuccess())
                },
                rsp
            )
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function postEmailVerificationThunk(key: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            dispatch(postEmailVerificationStart())
            await getAllauthByClientV1Config({ path })
            const rsp = await postAllauthByClientV1AuthEmailVerify({
                path,
                body: { key },
                headers: mkPostHeaders()
            })
            handleAllauthResponseFromClient(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('Email successfully verified'))
                    dispatch(postEmailVerificationSuccess())
                },
                rsp
            )
            // When there is no bad request, confirmation was successful
            if (rsp.error?.status == 401) {
                dispatch(addSuccessVanish('Email successfully verified'))
                dispatch(postEmailVerificationSuccess())
            } else if (rsp.error?.status == 400) {
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
