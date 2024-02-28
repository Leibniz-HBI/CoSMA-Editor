import { AppDispatch } from '../store'
import {
    loginError,
    loginStart,
    loginSuccess,
    logout,
    refreshDenied,
    refreshStart,
    refreshSuccess,
    registrationError,
    registrationStart,
    userSearchClear,
    userSearchError,
    userSearchStart,
    userSearchSuccess
} from './slice'
import { addError } from '../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { PublicUserInfo, UserInfo, UserPermissionGroup } from './state'
import { config } from '../config'
import { ThunkWithFetch } from '../util/type'
import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'

export function login(userName: string, password: string): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(loginStart())
        try {
            const rsp = await fetch(config.api_path + '/user/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: userName, password: password })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const msg = json['msg']
                if (msg !== undefined) {
                    dispatch(loginError())
                    dispatch(addError(errorMessageFromApi(json)))
                } else {
                    dispatch(loginSuccess(parseUserInfoFromJson(json)))
                }
            } else {
                const json = await rsp.json()
                let msg = json['msg']
                if (msg === undefined) {
                    msg = 'Unknown error'
                }
                dispatch(loginError())
                dispatch(addError(msg))
            }
        } catch (e: unknown) {
            dispatch(loginError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function refresh({
    withDispatch = true
}: {
    withDispatch?: boolean
}): ThunkWithFetch<UserInfo | undefined> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        if (withDispatch) {
            dispatch(refreshStart())
        }
        try {
            const rsp = await fetch(config.api_path + '/user/refresh', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const userInfo = parseUserInfoFromJson(json)
                if (withDispatch) {
                    dispatch(refreshSuccess(userInfo))
                }
                return userInfo
            } else {
                dispatch(refreshDenied())
            }
        } catch (error: unknown) {
            dispatch(refreshDenied())
        }
        return undefined
    }
}

export function registration({
    userName,
    namesPersonal,
    namesFamily = undefined,
    email,
    password
}: {
    userName: string
    namesPersonal: string
    namesFamily?: string
    email: string
    password: string
}): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(registrationStart())
        try {
            const rsp = await fetch(config.api_path + '/user/register', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: userName,
                    email: email,
                    names_family: namesFamily == '' ? null : namesFamily,
                    names_personal: namesPersonal,
                    password: password
                })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                dispatch(loginSuccess(parseUserInfoFromJson(json)))
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
                dispatch(registrationError())
                dispatch(addError(msg))
            }
        } catch (error: unknown) {
            dispatch(registrationError())
            dispatch(addError(exceptionMessage(error)))
        }
    }
}
export function logoutThunk(): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        dispatch(loginStart())
        try {
            const rsp = await fetch(config.api_path + '/user/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            })
            if (rsp.status == 200) {
                dispatch(logout())
            } else {
                const json = await rsp.json()
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function userSearch(searchTerm: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(userSearchStart())
        if (searchTerm == '') {
            dispatch(userSearchClear())
            return
        }
        try {
            const rsp = await fetch(
                config.api_path + '/user/search/' + encodeURI(searchTerm),
                { method: 'GET', credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                let userInfos
                if (json['contains_complete_info']) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    userInfos = json['results'].map((info: any) =>
                        parseUserInfoFromJson(info)
                    )
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    userInfos = json['results'].map((info: any) =>
                        parsePublicUserInfoFromJson(info)
                    )
                }
                dispatch(userSearchSuccess(userInfos))
            } else {
                dispatch(userSearchError())
                dispatch(addError(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(userSearchError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function remoteUserProfileColumnAppend(
    idTagPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        await fetch(
            config.api_path + `/user/tag_definitions/append/${idTagPersistent}`,
            {
                credentials: 'include',
                method: 'POST'
            }
        )
    }
}
export function remoteUserProfileColumnDelete(
    idTagPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        await fetch(config.api_path + `/user/tag_definitions/${idTagPersistent}`, {
            credentials: 'include',
            method: 'DELETE'
        })
    }
}
export function remoteUserProfileChangeColumIndex(
    idxStart: number,
    idxEnd: number
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        await fetch(
            config.api_path + `/user/tag_definitions/swap/${idxStart}/${idxEnd}`,
            {
                credentials: 'include',
                method: 'POST'
            }
        )
    }
}

const permissionGroupApiMap: { [key: string]: UserPermissionGroup } = {
    APPLICANT: UserPermissionGroup.APPLICANT,
    READER: UserPermissionGroup.READER,
    CONTRIBUTOR: UserPermissionGroup.CONTRIBUTOR,
    EDITOR: UserPermissionGroup.EDITOR,
    COMMISSIONER: UserPermissionGroup.COMMISSIONER
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUserInfoFromJson(json: any): UserInfo {
    return {
        username: json['username'],
        idPersistent: json['id_persistent'],
        email: json['email'],
        namesPersonal: json['names_personal'],
        namesFamily: json['names_family'],
        columns:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (json['tag_definition_list'] as Array<any>).map((tagDefinitionApi) =>
                parseColumnDefinitionsFromApi(tagDefinitionApi, undefined)
            ),
        permissionGroup: permissionGroupApiMap[json['permission_group']]
    }
}

export function parsePublicUserInfoFromJson(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userInfoJson: any
): PublicUserInfo {
    const idPersistent = userInfoJson['id_persistent']
    const userName = userInfoJson['username']
    const permissionGroup = permissionGroupApiMap[userInfoJson['permission_group']]
    return { username: userName, idPersistent, permissionGroup }
}
