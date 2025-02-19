import { UserInfo } from '../user/state'
import { newRemote, RemoteInterface } from '../util/state'

export enum AuthStep {
    LoggedOut,
    Initial,
    Session,
    Login,
    Signup,
    Authenticated
}

export interface UserAllAuth {
    id: number
    display: string
    email: string | undefined
    username?: string
}

export interface AuthState {
    userAuth: UserAllAuth | undefined
    user: RemoteInterface<UserInfo | undefined>
    step: RemoteInterface<AuthStep>
    showRegistration: RemoteInterface<boolean>
}

export function newAuthState({
    userAuth = undefined,
    user = newRemote(undefined),
    step = newRemote(AuthStep.Initial),
    showRegistration = newRemote(false)
}: {
    user?: RemoteInterface<UserInfo | undefined>
    userAuth?: UserAllAuth | undefined
    step?: RemoteInterface<AuthStep>
    showRegistration?: RemoteInterface<boolean>
}): AuthState {
    return {
        user,
        userAuth,
        step,
        showRegistration
    }
}
