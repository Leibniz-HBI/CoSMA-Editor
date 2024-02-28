import { TagDefinition } from '../column_menu/state'
import { Remote, RemoteInterface } from '../util/state'

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
    columns: TagDefinition[]
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
    columns?: TagDefinition[]
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
    userInfo?: UserInfo
    showRegistration: boolean
    isLoggingIn: boolean
    isRegistering: boolean
    isRefreshing: boolean
    userSearchResults: RemoteInterface<(PublicUserInfo | UserInfo)[]>
}

export function newUserState({
    userInfo = undefined,
    showRegistration = false,
    isLoggingIn = false,
    isRegistering = false,
    isRefreshing = false,
    userSearchResults = new Remote([])
}: {
    userInfo?: UserInfo
    showRegistration?: boolean
    isLoggingIn?: boolean
    isRegistering?: boolean
    isRefreshing?: boolean
    userSearchResults?: Remote<(PublicUserInfo | UserInfo)[]>
}): UserState {
    return {
        userInfo,
        showRegistration,
        isLoggingIn,
        isRegistering,
        isRefreshing,
        userSearchResults
    }
}
