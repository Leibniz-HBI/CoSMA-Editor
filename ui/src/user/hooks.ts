import { Context, createContext, useReducer } from 'react'
import { userReducer } from './reducer'
import { useThunkReducer } from '../util/state'
import { UserInfo, UserState } from './state'
import {
    LoginAction,
    RefreshAction,
    RegistrationAction,
    RemoteUserProfileChangeColumIndexAction,
    RemoteUserProfileColumnAppendAction,
    RemoteUserProfileColumnDeleteAction
} from './async_actions'
import {
    LoginErrorClearAction,
    LoginSuccessAction,
    LogoutAction,
    RegistrationErrorClearAction,
    ToggleRegistrationAction
} from './actions'
import { ErrorState } from '../util/error'

export const UserContext: Context<UserInfoWithCallbacks | undefined> = createContext<
    UserInfoWithCallbacks | undefined
>(undefined)

export type AppendToDefaultTagDefinitionsCallback = (idPersistent: string) => void
export type ChangeDefaultTagDefinitionsCallback = (
    idxStart: number,
    idxEnd: number
) => void
export type DefaultTagDefinitionsCallbacks = {
    appendToDefaultTagDefinitionsCallback: AppendToDefaultTagDefinitionsCallback
    removeFromDefaultTagDefinitionListCallback: AppendToDefaultTagDefinitionsCallback
    changeDefaultTagDefinitionsCallback: ChangeDefaultTagDefinitionsCallback
}
export type UserInfoWithCallbacks = {
    userInfo: UserInfo
    logoutCallback: VoidFunction
    defaultTagDefinitionsCallbacks: DefaultTagDefinitionsCallbacks
    userInfoPromise: () => Promise<UserInfo | undefined>
}
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
    userInfoWithCallbacks?: UserInfoWithCallbacks
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
        userInfoWithCallbacks: state.userInfo
            ? {
                  userInfo: state.userInfo,
                  userInfoPromise: () => dispatch(new RefreshAction(false)),
                  logoutCallback: () => dispatch(new LogoutAction()),
                  defaultTagDefinitionsCallbacks: {
                      appendToDefaultTagDefinitionsCallback: (idPersistent) =>
                          dispatch(
                              new RemoteUserProfileColumnAppendAction(idPersistent)
                          ),
                      removeFromDefaultTagDefinitionListCallback: (idPersistent) =>
                          dispatch(
                              new RemoteUserProfileColumnDeleteAction(idPersistent)
                          ),
                      changeDefaultTagDefinitionsCallback: (idxStart, idxEnd) =>
                          dispatch(
                              new RemoteUserProfileChangeColumIndexAction(
                                  idxStart,
                                  idxEnd
                              )
                          )
                  }
              }
            : undefined,
        showRegistration: state.showRegistration,
        loginErrorState: state.loginErrorState,
        registrationErrorState: state.registrationErrorState,
        refreshCallback: () =>
            dispatch(new RefreshAction(true)).then((userInfo) => {
                if (userInfo !== undefined) {
                    dispatch(new LoginSuccessAction(userInfo))
                }
            }),
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
