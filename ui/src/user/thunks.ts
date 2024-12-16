import {
    getUserInfoError,
    getUserInfoStart,
    getUserInfoSuccess,
    userSearchClear,
    userSearchError,
    userSearchStart,
    userSearchSuccess
} from './slice'
import { addError} from '../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { PublicUserInfo, UserInfo, UserPermissionGroup } from './state'
import { config } from '../config'
import { ThunkWithFetch } from '../util/type'
import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'
import { justificationColumnId } from '../table/state'
import { setCurrentEditSession } from '../session/slice'
import { parseEditSessionFromApi } from '../session/thunks'
import { removeUserTagDefinition } from '../auth/slice'



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
            const rsp = await fetch(config.api_path + `/user/${idUserPersistent}`, {
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
    idTagPersistent: string
): ThunkWithFetch<void> {
    return async (_dispatch, _getState, fetch) => {
        if (idTagPersistent == justificationColumnId) {
            return
        }
        await fetch(
            config.api_path + `/user/tag_definitions/append/${idTagPersistent}`,
            {
                credentials: 'include',
                method: 'POST'
            }
        )
    }
}
export function remoteUserProfileColumnDeleteAsync(
    idTagPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        if (idTagPersistent == justificationColumnId) {
            return
        }
        const rsp = await fetch(
            config.api_path + `/user/tag_definitions/${idTagPersistent}`,
            {
                credentials: 'include',
                method: 'DELETE'
            }
        )
        if (rsp.status == 200) {
            dispatch(removeUserTagDefinition(idTagPersistent))
        }
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
