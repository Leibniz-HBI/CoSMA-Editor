import {
    deleteSshKeyEnd,
    deleteSshKeyStart,
    deleteSshKeySuccess,
    getSshKeyListEnd,
    getSshKeyListStart,
    getSshKeyListSuccess,
    getUserInfoError,
    getUserInfoStart,
    getUserInfoSuccess,
    putSshKeyEnd,
    putSshKeyStart,
    putSshKeySuccess,
    userSearchClear,
    userSearchError,
    userSearchStart,
    userSearchSuccess
} from './slice'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { PublicUserInfo, SshKey, UserInfo, UserPermissionGroup } from './state'
import { config } from '../config'
import { ThunkWithFetch } from '../util/type'
import { parseColumnsFromApi } from '../column_menu/thunks'
import { justificationColumnId } from '../table/state'
import { setCurrentEditSession } from '../session/slice'
import { parseEditSessionFromApi } from '../session/thunks'
import { removeUserColumn } from '../auth/slice'
import { handleAllauthResponse } from '../util/api'

export function setCurrentEditSessionThunk(
    id_edit_session_persistent: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(config.api_path + '/user/edit_session', {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({ id_edit_session_persistent })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(setCurrentEditSession(parseEditSessionFromApi(json)))
                return true
            }
            dispatch(addError(errorMessageFromApi(json)))
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function setPasswordThunk(
    oldPassword: string,
    newPassword: string,
    onSuccess?: VoidFunction
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(config.api_path + '/user/password', {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            })
            const json = await rsp.json()
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('Password changed'))
                    if (onSuccess !== undefined) {
                        onSuccess()
                    }
                },
                json
            )
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

export function getUserInfoThunk(idUserPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getUserInfoStart(idUserPersistent))
        try {
            const rsp = await fetch(config.api_path + `/user/id/${idUserPersistent}`, {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const user = parsePublicUserInfoFromJson(json)
                dispatch(getUserInfoSuccess(user))
            } else {
                dispatch(getUserInfoError(idUserPersistent))
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(getUserInfoError(idUserPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function remoteUserProfileColumnAppend(
    idColumnPersistent: string
): ThunkWithFetch<void> {
    return async (_dispatch, _getState, fetch) => {
        if (idColumnPersistent == justificationColumnId) {
            return
        }
        await fetch(config.api_path + `/user/columns/append/${idColumnPersistent}`, {
            credentials: 'include',
            method: 'POST'
        })
    }
}
export function remoteUserProfileColumnDeleteAsync(
    idColumnPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        if (idColumnPersistent == justificationColumnId) {
            return
        }
        const rsp = await fetch(
            config.api_path + `/user/columns/${idColumnPersistent}`,
            {
                credentials: 'include',
                method: 'DELETE'
            }
        )
        if (rsp.status == 200) {
            dispatch(removeUserColumn(idColumnPersistent))
        }
    }
}
export function remoteUserProfileChangeColumIndex(
    idxStart: number,
    idxEnd: number
): ThunkWithFetch<void> {
    return async (_dispatch, _getState, fetch) => {
        await fetch(config.api_path + `/user/columns/swap/${idxStart}/${idxEnd}`, {
            credentials: 'include',
            method: 'POST'
        })
    }
}

export function getSshKeyListThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getSshKeyListStart())
        try {
            const rsp = await fetch(config.api_path + '/user/ssh', {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const sshKeys = json.key_list.map((keyJson: unknown) =>
                    parseSshKeyFromJson(keyJson)
                )
                dispatch(getSshKeyListSuccess(sshKeys))
                return
            } else {
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(getSshKeyListEnd())
    }
}

export function putSshKeyThunk(sshKeyString: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(putSshKeyStart())
        try {
            const rsp = await fetch(config.api_path + '/user/ssh', {
                credentials: 'include',
                method: 'PUT',
                body: JSON.stringify({ key: sshKeyString })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const sshKey = parseSshKeyFromJson(json)
                dispatch(putSshKeySuccess(sshKey))
                return
            }
            dispatch(addError(errorMessageFromApi(json)))
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(putSshKeyEnd())
    }
}
export function deleteSshKeyThunk(idSshKeyPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(deleteSshKeyStart())
        try {
            const rsp = await fetch(
                config.api_path + '/user/ssh/key/' + idSshKeyPersistent,
                {
                    credentials: 'include',
                    method: 'DELETE'
                }
            )
            if (rsp.status == 200) {
                dispatch(deleteSshKeySuccess(idSshKeyPersistent))
                return
            }
            const json = await rsp.json()
            dispatch(addError(errorMessageFromApi(json)))
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(deleteSshKeyEnd())
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
            (json['column_list'] as Array<any>).map((columnApi) =>
                parseColumnsFromApi(columnApi, undefined)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSshKeyFromJson(keyJson: any): SshKey {
    return {
        idPersistent: keyJson['id_persistent'],
        name: keyJson['name'],
        type: keyJson['type']
    }
}
