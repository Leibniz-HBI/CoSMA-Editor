import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { newRemote, RemoteInterface } from '../util/state'
import {
    makeSelectAuxiliaryEntityByIdPersistent,
    selectEntityByIdPersistentMap
} from './selectors'
import { RootState } from '../store'
import { getEntityThunk } from './thunks'
import { mkUpUntilDateColumnId } from '../util/misc'
import { Entity } from './state'

export function useEntity(idPersistent: string, upUntilTime: Date | undefined) {
    const selectAuxiliaryEntityByIdPersistent = useMemo(
        makeSelectAuxiliaryEntityByIdPersistent,
        []
    )
    const selectAuxiliaryEntity = (state: RootState) =>
        selectAuxiliaryEntityByIdPersistent(state, idPersistent, upUntilTime)
    const auxiliaryEntity = useAppSelector(selectAuxiliaryEntity)
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            if (
                auxiliaryEntity === undefined ||
                (auxiliaryEntity.value === undefined && !auxiliaryEntity.isLoading)
            ) {
                dispatch(getEntityThunk([idPersistent], upUntilTime))
            }
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idPersistent]
    )
    return auxiliaryEntity ? auxiliaryEntity : newRemote(undefined)
}

export function useEntityByIdPersistentList(
    idPersistentList: string[],
    upUntilTime: Date | undefined
) {
    const dispatch = useAppDispatch()
    const entitiesCache = useAppSelector(selectEntityByIdPersistentMap)
    const ret: RemoteInterface<Entity | undefined>[] = [],
        toLoad: string[] = []
    idPersistentList.forEach((idPersistent) => {
        const key = mkUpUntilDateColumnId(idPersistent, upUntilTime)
        const entity = entitiesCache.list.at(entitiesCache.indexMap[key])
        if (entity !== undefined) {
            ret.push(entity)
        } else {
            ret.push(newRemote(undefined))
            toLoad.push(idPersistent)
        }
    })
    dispatch(getEntityThunk(toLoad, upUntilTime))
    return ret
}
