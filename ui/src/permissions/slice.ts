import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    newPermissionState,
    newUserPermissionSet,
    PermissionState,
    UserPermissionSet
} from './state'
import { newRemote } from '../util/state'

const permissionsSlice = createSlice({
    name: 'permissions',
    initialState: newPermissionState({}),
    reducers: {
        getPermissionsError(state: PermissionState, action: PayloadAction<string>) {
            state.permissionsForResourceByIdPersistent[action.payload].isLoading = false
        },
        getPermissionsStart(state: PermissionState, action: PayloadAction<string>) {
            state.permissionsForResourceByIdPersistent[action.payload] = newRemote(
                undefined,
                true
            )
        },
        getPermissionsSuccess(
            state: PermissionState,
            action: PayloadAction<{
                idResourcePersistent: string
                permissions: UserPermissionSet[]
            }>
        ) {
            state.permissionsForResourceByIdPersistent[
                action.payload.idResourcePersistent
            ] = newRemote(action.payload.permissions)
        },
        clearPermissionsForResource(
            state: PermissionState,
            action: PayloadAction<string>
        ) {
            delete state.permissionsForResourceByIdPersistent[action.payload]
        },
        setPermissionSuccess(
            state: PermissionState,
            action: PayloadAction<{
                idUserPersistent: string
                idResourcePersistent: string
                read: boolean
                write: boolean
            }>
        ) {
            const permissionList =
                state.permissionsForResourceByIdPersistent[
                    action.payload.idResourcePersistent
                ]
            const newPermissionSet = newUserPermissionSet({ ...action.payload })
            if (permissionList?.value === undefined) {
                state.permissionsForResourceByIdPersistent[
                    action.payload.idResourcePersistent
                ] = newRemote([newPermissionSet])
            } else {
                const idx = permissionList.value.findIndex(
                    (permissionSet) =>
                        permissionSet.idUserPersistent ==
                        action.payload.idUserPersistent
                )
                if (idx < 0) {
                    permissionList.value.push(newPermissionSet)
                } else {
                    permissionList.value.splice(idx, 1, newPermissionSet)
                }
            }
        }
    }
})

export const permissionsReducer = permissionsSlice.reducer

export const {
    getPermissionsError,
    getPermissionsStart,
    getPermissionsSuccess,
    clearPermissionsForResource,
    setPermissionSuccess
} = permissionsSlice.actions
