import { ColumnDefinition } from '../column_menu/state'
import { ErrorState } from '../util/error'

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

export class UserState {
    userInfo?: UserInfo
    showRegistration: boolean
    isLoggingIn: boolean
    isRegistering: boolean
    isRefreshing: boolean
    loginErrorState?: ErrorState
    registrationErrorState?: ErrorState
    constructor({
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
    }) {
        this.userInfo = userInfo
        this.showRegistration = showRegistration
        this.isLoggingIn = isLoggingIn
        this.isRegistering = isRegistering
        this.isRefreshing = isRefreshing
        this.loginErrorState = loginErrorState
        this.registrationErrorState = registrationErrorState
    }

    isLoggedIn() {
        return !(this.userInfo === undefined || this.userInfo === null)
    }

    isActive() {
        return this.isRegistering || this.isLoggingIn
    }
}
