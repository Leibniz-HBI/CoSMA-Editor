import { makeSelectUserInfoByIdPersistent } from './selectors'
import { getUserInfoThunk } from './thunks'
import { RootState } from '../store'
import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { newRemote } from '../util/state'

export function useUserInfo(idUserPersistent: string) {
    const selectUserInfoByIdPersistent = useMemo(makeSelectUserInfoByIdPersistent, [])
    const selectUserInfo = (state: RootState) =>
        selectUserInfoByIdPersistent(state, idUserPersistent)
    const userInfo = useAppSelector(selectUserInfo)
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (
            idUserPersistent === undefined || idUserPersistent == '' ||
            (userInfo !== undefined &&
                (userInfo.value !== undefined || userInfo.isLoading))
        ) {
            return
        }
            dispatch(getUserInfoThunk(idUserPersistent))
    })
    return userInfo ?? newRemote(undefined)
}
