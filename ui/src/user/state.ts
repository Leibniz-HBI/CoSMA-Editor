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
    idColumnPersistentList: string[]
}
export function newUserInfo({
    username,
    idPersistent,
    email,
    namesPersonal,
    namesFamily = undefined,
    permissionGroup,
    idColumnPersistentList: idColumnPersistentList = []
}: {
    username: string
    idPersistent: string
    email: string
    namesPersonal: string
    namesFamily?: string
    permissionGroup: UserPermissionGroup
    idColumnPersistentList?: string[]
}): UserInfo {
    return {
        username: username,
        idPersistent,
        permissionGroup,
        email: email,
        namesPersonal: namesPersonal,
        namesFamily: namesFamily,
        idColumnPersistentList
    }
}

export interface SshKey {
    type: string
    name: string
    idPersistent: string
}

export interface UserState {
    userInfoByIdPersistent: {
        [key: string]: RemoteInterface<PublicUserInfo | undefined>
    }
    userSearchResults: RemoteInterface<(PublicUserInfo | UserInfo)[]>
    sshKeyList: RemoteInterface<SshKey[] | undefined>
    submitSshKey: RemoteInterface<boolean | undefined>
}

export function newUserState({
    userInfoByIdPersistent = {},
    userSearchResults = newRemote([]),
    sshKeyList = newRemote(undefined),
    submitSshKey = newRemote(undefined)
}: {
    userInfoByIdPersistent?: {
        [key: string]: RemoteInterface<PublicUserInfo | undefined>
    }
    userSearchResults?: RemoteInterface<(PublicUserInfo | UserInfo)[]>
    sshKeyList?: RemoteInterface<SshKey[] | undefined>
    submitSshKey?: RemoteInterface<boolean | undefined>
}): UserState {
    return {
        userInfoByIdPersistent,
        userSearchResults,
        sshKeyList,
        submitSshKey
    }
}
