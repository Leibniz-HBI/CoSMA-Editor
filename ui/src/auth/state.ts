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
    ReauthenticationMfa,
    PasswordChange
}

export interface UserAllAuth {
    id: number
    display: string
    email: string | undefined
    username?: string
}

export interface EmailAllauth {
    email: string
    primary: boolean
    verified: boolean
}

export interface AuthState {
    userAuth: UserAllAuth | undefined
    user: RemoteInterface<UserInfo | undefined>
    stepStack: RemoteInterface<AuthStep[]>
    registration: RemoteInterface<boolean>
    totpUrl: RemoteInterface<string | undefined>
    emailVerified: RemoteInterface<boolean | undefined>
    emailAddressList: RemoteInterface<EmailAllauth[] | undefined>
    passwordChangeRequired: boolean
}

export function newAuthState({
    userAuth = undefined,
    user = newRemote(undefined),
    stepStack = newRemote([]),
    registration = newRemote(false),
    totpUrl = newRemote(undefined),
    emailVerified = newRemote(undefined),
    emailAddressList = newRemote(undefined),
    passwordChangeRequired = false,
}: {
    user?: RemoteInterface<UserInfo | undefined>
    userAuth?: UserAllAuth | undefined
    stepStack?: RemoteInterface<AuthStep[]>
    registration?: RemoteInterface<boolean>
    totpUrl?: RemoteInterface<string | undefined>
    emailVerified?: RemoteInterface<boolean | undefined>
    emailAddressList?: RemoteInterface<EmailAllauth[] | undefined>
    passwordChangeRequired?: boolean
}): AuthState {
    return {
        user,
        userAuth,
        stepStack,
        registration,
        totpUrl,
        emailVerified,
        emailAddressList,
        passwordChangeRequired
    }
}
