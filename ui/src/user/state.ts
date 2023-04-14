import { ErrorState } from '../util/error'

export class UserInfo {
    userName: string
    email: string
    namesPersonal: string
    namesFamily?: string

    constructor(
        userName: string,
        email: string,
        namesPersonal: string,
        namesFamily?: string
    ) {
        this.userName = userName
        this.email = email
        this.namesPersonal = namesPersonal
        this.namesFamily = namesFamily
    }
}

export class UserState {
    userInfo?: UserInfo
    showRegistration: boolean
    isLoggingIn: boolean
    isRegistering: boolean
    isRefreshing: boolean
    loginEerrorState?: ErrorState
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
        this.loginEerrorState = loginErrorState
        this.registrationErrorState = registrationErrorState
    }

    isLoggedIn() {
        return !(this.userInfo === undefined || this.userInfo === null)
    }

    isActive() {
        return this.isRegistering || this.isLoggingIn
    }
}
