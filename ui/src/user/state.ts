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
    userName: string
    permissionGroup: UserPermissionGroup
}
export function newPublicUserInfo({
    idPersistent,
    userName,
    permissionGroup
}: {
    idPersistent: string
    userName: string
    permissionGroup: UserPermissionGroup
}) {
    return {
        userName: userName,
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
    userName,
    idPersistent,
    email,
    namesPersonal,
    namesFamily = undefined,
    permissionGroup,
    columns = []
}: {
    userName: string
    idPersistent: string
    email: string
    namesPersonal: string
    namesFamily?: string
    permissionGroup: UserPermissionGroup
    columns?: TagDefinition[]
}): UserInfo {
    return {
        userName,
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
