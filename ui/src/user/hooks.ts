import { Context, createContext, useReducer } from 'react'
import { userReducer } from './reducer'
import { useThunkReducer } from '../util/state'
import { UserInfo, UserState } from './state'
import { LoginAction, RefreshAction, RegistrationAction } from './async_actions'
import {
    LoginErrorClearAction,
    LogoutAction,
    RegistrationErrorClearAction,
    ToggleRegistrationAction
} from './actions'
import { ErrorState } from '../util/error'

export const UserContext: Context<UserInfoWithLogout | undefined> = createContext<
    UserInfoWithLogout | undefined
>(undefined)

export type UserInfoWithLogout = { userInfo: UserInfo; logoutCallback: VoidFunction }
export type LoginCallback = (userName: string, password: string) => void
export type RegistrationCallback = ({
    userName,
    namesPersonal,
    namesFamily,
    email,
    password
}: {
    userName: string
    namesPersonal: string
    namesFamily?: string
    email: string
    password: string
}) => void

export type HeaderProps = { logoutCallback?: VoidFunction }
export type UserProps = {
    userInfoWithLogout?: UserInfoWithLogout
    showRegistration: boolean
    loginErrorState?: ErrorState
    registrationErrorState?: ErrorState
    refreshCallback: VoidFunction
    loginCallback: LoginCallback
    clearLoginErrorCallback: VoidFunction
    registrationCallback: RegistrationCallback
    toggleRegistrationCallback: VoidFunction
    clearRegistrationErrorCallback: VoidFunction
}

export function useLogoutCallback() {
    const [_state, dispatch] = useReducer(userReducer, new UserState({}))
    return dispatch
}

export function useLogin(): UserProps {
    const [state, dispatch] = useThunkReducer(userReducer, new UserState({}))
    return {
        userInfoWithLogout: state.userInfo
            ? {
                  userInfo: state.userInfo,
                  logoutCallback: () => dispatch(new LogoutAction())
              }
            : undefined,
        showRegistration: state.showRegistration,
        loginErrorState: state.loginErrorState,
        registrationErrorState: state.registrationErrorState,
        refreshCallback: () => dispatch(new RefreshAction()),
        loginCallback: (userName: string, password: string) => {
            if (!state.isLoggingIn) {
                dispatch(new LoginAction(userName, password))
            }
        },
        clearLoginErrorCallback: () => dispatch(new LoginErrorClearAction()),
        registrationCallback: ({
            userName,
            namesPersonal,
            namesFamily,
            email,
            password
        }) => {
            if (!state.isRegistering) {
                dispatch(
                    new RegistrationAction({
                        userName: userName,
                        namesPersonal: namesPersonal,
                        namesFamily: namesFamily,
                        email: email,
                        password: password
                    })
                )
            }
        },
        clearRegistrationErrorCallback: () =>
            dispatch(new RegistrationErrorClearAction()),
        toggleRegistrationCallback: () => dispatch(new ToggleRegistrationAction())
    }
}
