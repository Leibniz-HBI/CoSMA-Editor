import { UserInfo } from '../user/state'
import { newRemote, RemoteInterface } from '../util/state'

export enum AuthStep {
    LoggedOut,
    Session,
    Login,
    Signup,
    PartiallyAuthenticated,
    VerifyEmail,
    Totp,
    Authenticated,
    Reauthentication,
    ReauthenticationMfa
}

export interface UserAllAuth {
    id: number
    display: string
    email: string | undefined
    username?: string
}

export interface EmailAllauth {
    email:string
    primary: boolean
    verified: boolean
}

export interface AuthState {
    userAuth: UserAllAuth | undefined
    user: RemoteInterface<UserInfo | undefined>
    stepStack: RemoteInterface<AuthStep[]>
    showRegistration: RemoteInterface<boolean>
    totpUrl: RemoteInterface<string | undefined>
    emailVerified: RemoteInterface<boolean | undefined>
    emailAddressList: RemoteInterface<EmailAllauth[]|undefined>
}

export function newAuthState({
    userAuth = undefined,
    user = newRemote(undefined),
    stepStack = newRemote([]),
    showRegistration = newRemote(false),
    totpUrl = newRemote(undefined),
    emailVerified = newRemote(undefined),
    emailAddressList = newRemote(undefined)
}: {
    user?: RemoteInterface<UserInfo | undefined>
    userAuth?: UserAllAuth | undefined
    stepStack?: RemoteInterface<AuthStep[]>
    showRegistration?: RemoteInterface<boolean>
    totpUrl?: RemoteInterface<string | undefined>
    emailVerified?: RemoteInterface<boolean | undefined>
    emailAddressList?: RemoteInterface<EmailAllauth[]|undefined>
}): AuthState {
    return {
        user,
        userAuth,
        stepStack,
        showRegistration,
        totpUrl,
        emailVerified,
        emailAddressList
    }
}
