import { useEffect, useMemo } from 'react'
import { makeSelectEditSessionByIdPersistent } from './selectors'
import { RootState } from '../store'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
    getEditSessionOwnerListThunk,
    getEditSessionParticipantListThunk
} from './thunks'

export function useEditSessionByIdPersistent(idPersistent: string) {
    const selectEditSessionByIdPersistent = useMemo(
        makeSelectEditSessionByIdPersistent,
        [idPersistent]
    )
    const selectEditSession = (state: RootState) =>
        selectEditSessionByIdPersistent(state, idPersistent)
    const remoteEditSession = useAppSelector(selectEditSession)
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (idPersistent == '') {
            return
        }
        if (remoteEditSession.value === undefined && !remoteEditSession.isLoading) {
            dispatch(getEditSessionOwnerListThunk())
            dispatch(getEditSessionParticipantListThunk)
        }
    })
    if (remoteEditSession.value?.idPersistent == idPersistent) {
        return remoteEditSession.value
    }
    return undefined
}
