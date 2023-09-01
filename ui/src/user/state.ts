import { ColumnDefinition } from '../column_menu/state'
import { ErrorState } from '../util/error/slice'

export enum UserPermissionGroup {
    APPLICANT = 'Applicant',
    READER = 'Reader',
    CONTRIBUTOR = 'Contributor',
    EDITOR = 'Editor',
    COMMISSIONER = 'Commissioner'
}

export class PublicUserInfo {
    idPersistent: string
    userName: string
    permissionGroup: UserPermissionGroup
    constructor({
        idPersistent,
        userName,
        permissionGroup
    }: {
        idPersistent: string
        userName: string
        permissionGroup: UserPermissionGroup
    }) {
        this.userName = userName
        this.idPersistent = idPersistent
        this.permissionGroup = permissionGroup
    }
}

export class UserInfo extends PublicUserInfo {
    email: string
    namesPersonal: string
    namesFamily?: string
    columns: ColumnDefinition[]
    constructor({
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
        columns?: ColumnDefinition[]
    }) {
        super({ userName, idPersistent, permissionGroup })
        this.email = email
        this.namesPersonal = namesPersonal
        this.namesFamily = namesFamily
        this.columns = columns
    }
}

export interface UserState {
    userInfo?: UserInfo
    showRegistration: boolean
    isLoggingIn: boolean
    isRegistering: boolean
    isRefreshing: boolean
    loginErrorState?: ErrorState
    registrationErrorState?: ErrorState
}

export function mkUserState({
    userInfo = undefined,
    showRegistration = false,
    isLoggingIn = false,
    isRegistering = false,
    isRefreshing = false,
    loginErrorState = undefined,
    registrationErrorState = undefined
}: {
    userInfo?: UserInfo
    showRegistration?: boolean
    isLoggingIn?: boolean
    isRegistering?: boolean
    isRefreshing?: boolean
    loginErrorState?: ErrorState
    registrationErrorState?: ErrorState
}): UserState {
    return {
        userInfo: userInfo,
        showRegistration: showRegistration,
        isLoggingIn: isLoggingIn,
        isRegistering: isRegistering,
        isRefreshing: isRefreshing,
        loginErrorState: loginErrorState,
        registrationErrorState: registrationErrorState
    }
}
