import { UserInfo } from "../user/state"
import { newRemote, RemoteInterface } from "../util/state"

export enum AuthStep {
    Initial,
    Session,
    Config,
    Redirect,
    Login,
    Authenticated
}

export interface UserAllAuth {
    id: number
    display: string
    email: string | undefined
    username?: string
}

export interface SsoProvider {
    id: string
    name: string
    flows: string[]
}

export interface AuthState {
    userAuth: UserAllAuth | undefined
    user: RemoteInterface<UserInfo |undefined>
    step: RemoteInterface<AuthStep>
    providers: SsoProvider[] | undefined
}

export function newAuthState({
    userAuth = undefined,
    user = newRemote(undefined),
    step = newRemote(AuthStep.Initial),
    providers = undefined
}: {
    user?: RemoteInterface<UserInfo|undefined>
    userAuth?: UserAllAuth | undefined
    step?: RemoteInterface<AuthStep>
    providers?: SsoProvider[] | undefined
}): AuthState {
    return {
        user,
        userAuth,
        step,
        providers
    }
}
