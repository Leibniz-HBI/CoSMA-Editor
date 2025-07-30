import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { RootState } from '../store'
import {
    makeSelectColumnByIdPersistent,
    makeSelectColumnByIdPersistentList
} from './selectors'
import { newRemote } from '../util/state'
import { getColumnDetailsThunk } from './thunks'

export function useColumn(
    idPersistent: string,
    upUntilDate: Date | undefined = undefined
) {
    const selectColumnByIdPersistent = useMemo(makeSelectColumnByIdPersistent, [])
    const selectColumn = (state: RootState) =>
        selectColumnByIdPersistent(state, idPersistent, upUntilDate)
    const remoteColumn = useAppSelector(selectColumn)
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (
            remoteColumn === undefined ||
            (remoteColumn.value === undefined && !remoteColumn.isLoading)
        ) {
            dispatch(getColumnDetailsThunk([idPersistent], upUntilDate))
        }
    }, [idPersistent, upUntilDate])
    return remoteColumn ?? newRemote(undefined)
}

export function useColumnDefinitionList(
    idPersistentList: string[],
    upUntilDate: Date | undefined = undefined
) {
    const selectColumnDefinitionsByIdPersistentList = useMemo(
        makeSelectColumnByIdPersistentList,
        []
    )
    const selectColumnDefinition = (state: RootState) =>
        selectColumnDefinitionsByIdPersistentList(state, idPersistentList, upUntilDate)
    const remoteColumnDefinitionList = useAppSelector(selectColumnDefinition)
    const dispatch = useAppDispatch()
    useEffect(() => {
        const requestList = []
        for (let idx = 0; idx < idPersistentList.length; idx++) {
            const remoteColumnDefinition = remoteColumnDefinitionList[idx]
            if (
                remoteColumnDefinition === undefined ||
                (remoteColumnDefinition.value === undefined &&
                    !remoteColumnDefinition.isLoading)
            ) {
                requestList.push(idPersistentList[idx])
            }
        }
        if (requestList.length > 0) {
            dispatch(getColumnDetailsThunk(requestList, upUntilDate))
        }
    }, [idPersistentList, upUntilDate])
    return remoteColumnDefinitionList.map(
        (remoteColumnDefinition) => remoteColumnDefinition ?? newRemote(undefined)
    )
}
