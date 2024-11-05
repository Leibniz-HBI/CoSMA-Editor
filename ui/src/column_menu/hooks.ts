import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { RootState } from '../store'
import {
    makeSelectTagDefinitionByIdPersistent,
    makeSelectTagDefinitionsByIdPersistentList
} from './selectors'
import { newRemote } from '../util/state'
import { getTagDefinitionDetailsThunk } from './thunks'

export function useTagDefinition(idPersistent: string) {
    const selectTagDefinitionByIdPersistent = useMemo(
        makeSelectTagDefinitionByIdPersistent,
        []
    )
    const selectTagDefinition = (state: RootState) =>
        selectTagDefinitionByIdPersistent(state, idPersistent)
    const remoteTagDefinition = useAppSelector(selectTagDefinition)
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            if (
                remoteTagDefinition === undefined ||
                (remoteTagDefinition.value === undefined &&
                    !remoteTagDefinition.isLoading)
            ) {
                dispatch(getTagDefinitionDetailsThunk([idPersistent]))
            }
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idPersistent]
    )
    return remoteTagDefinition ?? newRemote(undefined)
}

export function useTagDefinitionList(idPersistentList: string[]) {
    const selectTagDefinitionsByIdPersistentList = useMemo(
        makeSelectTagDefinitionsByIdPersistentList,
        []
    )
    const selectTagDefinition = (state: RootState) =>
        selectTagDefinitionsByIdPersistentList(state, idPersistentList)
    const remoteTagDefinitionList = useAppSelector(selectTagDefinition)
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            const requestList = []
            for (let idx = 0; idx < idPersistentList.length; idx++) {
                const remoteTagDefinition = remoteTagDefinitionList[idx]
                if (
                    remoteTagDefinition === undefined ||
                    (remoteTagDefinition.value === undefined &&
                        !remoteTagDefinition.isLoading)
                ) {
                    requestList.push(idPersistentList[idx])
                }
            }
            if (requestList.length > 0) {
                dispatch(getTagDefinitionDetailsThunk(requestList))
            }
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idPersistentList]
    )
    return remoteTagDefinitionList.map(
        (remoteTagDefinition) => remoteTagDefinition ?? newRemote(undefined)
    )
}
