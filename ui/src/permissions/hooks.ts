import { useEffect, useMemo } from 'react'
import { makeSelectPermissionsByIdResourcePersistent } from './selectors'
import { RootState } from '../store'
import { useAppDispatch, useAppSelector } from '../hooks'
import { newRemote } from '../util/state'
import { getPermissionsForResourceThunk } from './thunks'

export function usePermissionListForResource(idResourcePersistent: string) {
    const selectPermissionListForResourceByIdPersistent = useMemo(
        makeSelectPermissionsByIdResourcePersistent,
        []
    )
    const selectPermissionList = (state: RootState) =>
        selectPermissionListForResourceByIdPersistent(state, idResourcePersistent)
    const permissionList = useAppSelector(selectPermissionList)
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (
            permissionList === undefined ||
            (permissionList.value === undefined && !permissionList.isLoading)
        ) {
            dispatch(getPermissionsForResourceThunk(idResourcePersistent))
        }
    })
    return permissionList ?? newRemote(undefined)
}
