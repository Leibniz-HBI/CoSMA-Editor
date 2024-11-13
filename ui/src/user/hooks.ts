import { UserInfo } from './state'
import { useDispatch, useSelector } from 'react-redux'
import {
    makeSelectUserInfoByIdPersistent,
    selectUser,
    selectUserInfo
} from './selectors'
import { getUserInfoThunk, login, refresh, registration } from './thunks'
import { loginSuccess, logout, toggleRegistration } from './slice'
import { AppDispatch, RootState } from '../store'
import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { newRemote } from '../util/state'

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
    refreshCallback: VoidFunction
    loginCallback: LoginCallback
    registrationCallback: RegistrationCallback
    toggleRegistrationCallback: VoidFunction
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
        toggleRegistrationCallback: () => dispatch(toggleRegistration())
    }
}

export function useUserInfo(idUserPersistent: string) {
    const selectUserInfoByIdPersistent = useMemo(makeSelectUserInfoByIdPersistent, [])
    const selectPermissionList = (state: RootState) =>
        selectUserInfoByIdPersistent(state, idUserPersistent)
    const userInfo = useAppSelector(selectPermissionList)
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (
            userInfo === undefined ||
            (userInfo.value === undefined && !userInfo.isLoading)
        ) {
            console.log(userInfo)
            dispatch(getUserInfoThunk(idUserPersistent))
        }
    })
    return userInfo ?? newRemote(undefined)
}
