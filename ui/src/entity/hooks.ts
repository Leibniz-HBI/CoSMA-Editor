import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { newRemote } from '../util/state'
import { makeSelectAuxiliaryEntityByIdPersistent } from './selectors'
import { RootState } from '../store'
import { getEntityThunk } from './thunks'
import { makeSelectEntityByIdPersistent } from '../table/selectors'

export function useEntity(idPersistent: string) {
    const selectEntityByIdPersistent = useMemo(makeSelectEntityByIdPersistent, [])
    const selectAuxiliaryEntityByIdPersistent = useMemo(
        makeSelectAuxiliaryEntityByIdPersistent,
        []
    )
    const selectEntity = (state: RootState) =>
        selectEntityByIdPersistent(state, idPersistent)
    const selectAuxiliaryEntity = (state: RootState) =>
        selectAuxiliaryEntityByIdPersistent(state, idPersistent)
    const entity = useAppSelector(selectEntity)
    const auxiliaryEntity = useAppSelector(selectAuxiliaryEntity)
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            if (
                entity === undefined &&
                (auxiliaryEntity === undefined ||
                    (auxiliaryEntity.value === undefined && !auxiliaryEntity.isLoading))
            ) {
                dispatch(getEntityThunk(idPersistent))
            }
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idPersistent]
    )
    return entity
        ? newRemote(entity)
        : auxiliaryEntity
        ? auxiliaryEntity
        : newRemote(undefined)
}
