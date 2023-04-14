import { Context, createContext, useContext, useReducer } from 'react'
import { userReducer } from './reducer'
import { useThunkReducer } from '../util/state'
import { UserState } from './state'
import { LoginAction, RefreshAction, RegistrationAction } from './async_actions'
import {
    LoginErrorClearAction,
    LogoutAction,
    RegistrationErrorClearAction,
    ToggleRegistrationAction
} from './actions'

export const UserContext: Context<UserState> = createContext(new UserState({}))

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
    state: UserState
    refreshCallback: VoidFunction
    loginCallback: LoginCallback
    clearLoginErrorCallback: VoidFunction
    logoutCallback: VoidFunction
    registrationCallback: RegistrationCallback
    toggleRegistrationCallback: VoidFunction
    clearRegistrationErrorCallback: VoidFunction
}

export function useLogoutCallback() {
    const stateFromContext = useContext(UserContext)
    const [_state, dispatch] = useReducer(userReducer, stateFromContext)
    return dispatch
}

export function useLogin(apiPath: string): UserProps {
    const [state, dispatch] = useThunkReducer(userReducer, new UserState({}))
    return {
        state,
        refreshCallback: () => dispatch(new RefreshAction(apiPath)),
        loginCallback: (userName: string, password: string) => {
            if (!state.isLoggingIn) {
                dispatch(new LoginAction(apiPath, userName, password))
            }
        },
        clearLoginErrorCallback: () => dispatch(new LoginErrorClearAction()),
        logoutCallback: () => dispatch(new LogoutAction()),
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
                        apiPath: apiPath,
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
