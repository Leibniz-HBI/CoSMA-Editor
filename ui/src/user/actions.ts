import { UserInfo } from './state'

/**
 * Indicates the login start
 */
export class LoginStartAction {}

/**
 * Indicates a successful login or registration
 */
export class LoginSuccessAction {
    userInfo: UserInfo
    constructor(userInfo: UserInfo) {
        this.userInfo = userInfo
    }
}

/**
 * Indicates that refresh has started
 */
export class RefreshStartAction {}

/**
 * Indicates that refresh was not successful
 */
export class RefreshDeniedAction {}

/**
 * Indicates an error during login
 */
export class LoginErrorAction {
    msg: string

    constructor(msg: string) {
        this.msg = msg
    }
}

/**
 * Indicates that the loginerror should be cleared.
 */
export class LoginErrorClearAction {}

/**
 * Indicates Registration start
 */
export class RegistrationStartAction {}

/**
 * Indicates an error during registration
 */
export class RegistrationErrorAction {
    msg: string

    constructor(msg: string) {
        this.msg = msg
    }
}

/**
 * Indicates that the registration error should be cleared.
 */
export class RegistrationErrorClearAction {}

/**
 * Indicates that Registration should be opened or closed
 */
export class ToggleRegistrationAction {}

/**
 * Indicates a logout
 */
export class LogoutAction {}

export type UserAction =
    | LoginStartAction
    | LoginSuccessAction
    | LoginErrorAction
    | LoginErrorClearAction
    | RegistrationStartAction
    | RegistrationErrorAction
    | RegistrationErrorClearAction
    | LogoutAction
    | RefreshStartAction
    | RefreshDeniedAction
    | ToggleRegistrationAction
