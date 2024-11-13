import { RemoteInterface } from '../util/state'

export interface PermissionSet {
    read: boolean
    write: boolean
}

export interface UserPermissionSet extends PermissionSet {
    idUserPersistent: string
}

export function newUserPermissionSet({
    idUserPersistent,
    read,
    write
}: {
    idUserPersistent: string
    read: boolean
    write: boolean
}): UserPermissionSet {
    return { idUserPersistent, read, write }
}

export interface PermissionState {
    permissionsForResourceByIdPersistent: {
        [key: string]: RemoteInterface<UserPermissionSet[] | undefined>
    }
}

export function newPermissionState({
    permissionsForResourceByIdPersistent = {}
}: {
    permissionsForResourceByIdPersistent?: {
        [key: string]: RemoteInterface<UserPermissionSet[] | undefined>
    }
}): PermissionState {
    return { permissionsForResourceByIdPersistent }
}
