import { UserInfo } from './state'
import { makeSelectUserInfoByIdPersistent } from './selectors'
import { getUserInfoThunk } from './thunks'
import { RootState } from '../store'
import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { newRemote } from '../util/state'

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
            dispatch(getUserInfoThunk(idUserPersistent))
        }
    })
    return userInfo ?? newRemote(undefined)
}
