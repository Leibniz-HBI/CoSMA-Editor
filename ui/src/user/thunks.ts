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
import { ThunkWithFetch } from '../util/type'
import { setCurrentEditSession } from '../session/slice'
import { parseEditSessionFromApi } from '../session/thunks'
import { handleAllauthResponse } from '../util/api'
import { PublicUserInfo as PublicUserInfoOpenApi } from '../openapi/cosmae/types.gen'
import {
    cosmaeUserApiGetSearch,
    cosmaeUserApiGetUser,
    cosmaeUserApiPostSetPasswordForUser,
    cosmaeUserApiSetEditSession,
    cosmaeUserSshApiDeleteKey,
    cosmaeUserSshApiGetKeyList,
    cosmaeUserSshApiPutSshKey
} from '../openapi/cosmae'

export function setCurrentEditSessionThunk(
    id_edit_session_persistent: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeUserApiSetEditSession({
                body: { id_edit_session_persistent }
            })
            if (rsp.data) {
                dispatch(setCurrentEditSession(parseEditSessionFromApi(rsp.data)))
                return true
            }
            dispatch(addError(errorMessageFromApi(rsp.error)))
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
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeUserApiPostSetPasswordForUser({
                body: {
                    old_password: oldPassword,
                    new_password: newPassword
                }
            })
            handleAllauthResponse(
                dispatch,
                (dispatch, _json) => {
                    dispatch(addSuccessVanish('Password changed'))
                    if (onSuccess !== undefined) {
                        onSuccess()
                    }
                },
                rsp
            )
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function userSearch(searchTerm: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(userSearchStart())
        if (searchTerm == '') {
            dispatch(userSearchClear())
            return
        }
        try {
            const rsp = await cosmaeUserApiGetSearch({
                path: { username: searchTerm }
            })
            const data = rsp.data
            if (data) {
                let userInfos
                if (data.contains_complete_info) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    userInfos = data.results.map((info: any) =>
                        parseUserInfoFromJson(info)
                    )
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    userInfos = data.results.map((info: any) =>
                        parsePublicUserInfoFromJson(info)
                    )
                }
                dispatch(userSearchSuccess(userInfos))
            } else {
                dispatch(userSearchError())
                dispatch(addError(rsp.error.msg))
            }
        } catch (e: unknown) {
            dispatch(userSearchError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getUserInfoThunk(idUserPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getUserInfoStart(idUserPersistent))
        try {
            const rsp = await cosmaeUserApiGetUser({
                path: { id_user_persistent: idUserPersistent }
            })
            if (rsp.data) {
                const user = parsePublicUserInfoFromJson(rsp.data)
                dispatch(getUserInfoSuccess(user))
            } else {
                dispatch(getUserInfoError(idUserPersistent))
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(getUserInfoError(idUserPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getSshKeyListThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getSshKeyListStart())
        try {
            const rsp = await cosmaeUserSshApiGetKeyList({})
            if (rsp.data) {
                const sshKeys = rsp.data.key_list.map((keyJson: unknown) =>
                    parseSshKeyFromJson(keyJson)
                )
                dispatch(getSshKeyListSuccess(sshKeys))
                return
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(getSshKeyListEnd())
    }
}

export function putSshKeyThunk(sshKeyString: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(putSshKeyStart())
        try {
            const rsp = await cosmaeUserSshApiPutSshKey({ body: { key: sshKeyString } })
            if (rsp.data) {
                const sshKey = parseSshKeyFromJson(rsp.data)
                dispatch(putSshKeySuccess(sshKey))
                return
            }
            dispatch(addError(errorMessageFromApi(rsp.error)))
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(putSshKeyEnd())
    }
}
export function deleteSshKeyThunk(idSshKeyPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(deleteSshKeyStart())
        try {
            const rsp = await cosmaeUserSshApiDeleteKey({
                path: { id_key_persistent: idSshKeyPersistent }
            })
            if (!rsp.error) {
                dispatch(deleteSshKeySuccess(idSshKeyPersistent))
                return
            }
            dispatch(addError(errorMessageFromApi(rsp.error)))
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
        idColumnPersistentList: json['id_column_persistent_list'],
        permissionGroup: permissionGroupApiMap[json['permission_group']],
        isActive: json['is_active'],
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

export function parsePublicUserInfoFromOpenApi(
    publicUserInfo: PublicUserInfoOpenApi
): PublicUserInfo {
    const idPersistent = publicUserInfo.id_persistent
    const userName = publicUserInfo.username
    const permissionGroup = permissionGroupApiMap[publicUserInfo.permission_group]
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
