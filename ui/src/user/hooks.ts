import { UserInfo } from './state'
import { ErrorState } from '../util/error/slice'
import { useDispatch, useSelector } from 'react-redux'
import { selectUser, selectUserInfo } from './selectors'
import { login, refresh, registration } from './thunks'
import {
    loginErrorClear,
    loginSuccess,
    logout,
    registrationErrorClear,
    toggleRegistration
} from './slice'
import { AppDispatch } from '../store'

export type UserInfoWithCallbacks = {
    userInfo: UserInfo
    logoutCallback: VoidFunction
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

export function useLogin(): UserProps {
    const state = useSelector(selectUser)
    const userInfo = useSelector(selectUserInfo)
    const dispatch: AppDispatch = useDispatch()
    return {
        userInfoWithCallbacks: userInfo
            ? {
                  userInfo: userInfo,
                  userInfoPromise: () => dispatch(refresh({ withDispatch: false })),
                  logoutCallback: logout
              }
            : undefined,
        showRegistration: state.showRegistration,
        loginErrorState: state.loginErrorState,
        registrationErrorState: state.registrationErrorState,
        refreshCallback: () =>
            dispatch(refresh({})).then((userInfo) => {
                if (userInfo !== undefined) {
                    loginSuccess(userInfo)
                }
            }),
        loginCallback: (userName: string, password: string) => {
            if (!state.isLoggingIn) {
                dispatch(login(userName, password))
            }
        },
        clearLoginErrorCallback: loginErrorClear,
        registrationCallback: ({
            userName,
            namesPersonal,
            namesFamily,
            email,
            password
        }) => {
            if (!state.isRegistering) {
                dispatch(
                    registration({
                        userName: userName,
                        namesPersonal: namesPersonal,
                        namesFamily: namesFamily,
                        email: email,
                        password: password
                    })
                )
            }
        },
        clearRegistrationErrorCallback: () => dispatch(registrationErrorClear()),
        toggleRegistrationCallback: () => dispatch(toggleRegistration())
    }
}
