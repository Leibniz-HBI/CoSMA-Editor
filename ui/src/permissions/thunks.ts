import { config } from '../config'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    getPermissionsError,
    getPermissionsStart,
    getPermissionsSuccess,
    setPermissionSuccess
} from './slice'
import { newUserPermissionSet, PermissionSet, UserPermissionSet } from './state'

export function getPermissionsForResourceThunk(
    idResourcePersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getPermissionsStart(idResourcePersistent))
        try {
            const rsp = await fetch(
                config.api_path + `/permissions/resource/${idResourcePersistent}`,
                { credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const permissions = json['user_permission_list'].map(
                    (userPermission: unknown) =>
                        parseUserPermissionSetFromJson(userPermission)
                )
                dispatch(getPermissionsSuccess({ idResourcePersistent, permissions }))
            } else {
                dispatch(getPermissionsError(idResourcePersistent))
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(getPermissionsError(idResourcePersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function setPermissionThunk({
    idResourcePersistent,
    idUserPersistent,
    read,
    write
}: {
    idResourcePersistent: string
    idUserPersistent: string
    read: boolean | undefined
    write: boolean | undefined
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(
                config.api_path +
                    `/permissions/${idResourcePersistent}/${idUserPersistent}`,
                {
                    method: 'put',
                    credentials: 'include',
                    body: JSON.stringify({ read, write })
                }
            )
            const json = await rsp.json()
            const permission = parsePermissionSetFromJson(json)
            if (rsp.status == 200) {
                dispatch(
                    setPermissionSuccess({
                        idUserPersistent,
                        idResourcePersistent,
                        read: permission.read,
                        write: permission.write
                    })
                )
                dispatch(addSuccessVanish('Successfully changed permission'))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function parsePermissionSetFromJson(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userPermissionSetJson: any
): PermissionSet {
    return {
        read: userPermissionSetJson['read'],
        write: userPermissionSetJson['write']
    }
}

export function parseUserPermissionSetFromJson(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userPermissionSetJson: any
): UserPermissionSet {
    return newUserPermissionSet({
        idUserPersistent: userPermissionSetJson['id_user_persistent'],
        read: userPermissionSetJson['read'],
        write: userPermissionSetJson['write']
    })
}
