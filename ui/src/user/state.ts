import { ColumnDefinition } from '../column_menu/state'
import { ErrorState } from '../util/error'

export class UserInfo {
    userName: string
    email: string
    namesPersonal: string
    namesFamily?: string
    columns: ColumnDefinition[]
    constructor({
        userName,
        email,
        namesPersonal,
        namesFamily = undefined,
        columns = []
    }: {
        userName: string
        email: string
        namesPersonal: string
        namesFamily?: string
        columns?: ColumnDefinition[]
    }) {
        this.userName = userName
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
