import { Column } from '../column_menu/state'
import { RemoteInterface, newRemote } from '../util/state'

export enum UserPermissionGroup {
    APPLICANT = 'Applicant',
    READER = 'Reader',
    CONTRIBUTOR = 'Contributor',
    EDITOR = 'Editor',
    COMMISSIONER = 'Commissioner'
}

export interface PublicUserInfo {
    idPersistent: string
    username: string
    permissionGroup: UserPermissionGroup
}
export function newPublicUserInfo({
    idPersistent,
    username,
    permissionGroup
}: {
    idPersistent: string
    username: string
    permissionGroup: UserPermissionGroup
}) {
    return {
        username: username,
        idPersistent: idPersistent,
        permissionGroup: permissionGroup
    }
}

export interface UserInfo extends PublicUserInfo {
    email: string
    namesPersonal: string
    namesFamily?: string
    columns: Column[]
}
export function newUserInfo({
    username,
    idPersistent,
    email,
    namesPersonal,
    namesFamily = undefined,
    permissionGroup,
    columns = []
}: {
    username: string
    idPersistent: string
    email: string
    namesPersonal: string
    namesFamily?: string
    permissionGroup: UserPermissionGroup
    columns?: Column[]
}): UserInfo {
    return {
        username: username,
        idPersistent,
        permissionGroup,
        email: email,
        namesPersonal: namesPersonal,
        namesFamily: namesFamily,
        columns: columns
    }
}

export interface UserState {
    userInfoByIdPersistent: {
        [key: string]: RemoteInterface<PublicUserInfo | undefined>
    }
    userSearchResults: RemoteInterface<(PublicUserInfo | UserInfo)[]>
}

export function newUserState({
    userInfoByIdPersistent = {},
    userSearchResults = newRemote([])
}: {
    userInfoByIdPersistent?: {
        [key: string]: RemoteInterface<PublicUserInfo | undefined>
    }
    userSearchResults?: RemoteInterface<(PublicUserInfo | UserInfo)[]>
}): UserState {
    return {
        userInfoByIdPersistent,
        userSearchResults
    }
}
