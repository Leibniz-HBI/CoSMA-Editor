import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { RootState } from '../store'
import { makeSelectTagDefinitionByIdPersistent } from './selectors'
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
    return remoteTagDefinition ? remoteTagDefinition : newRemote(undefined)
}
