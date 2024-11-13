import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectPermissions(state: RootState) {
    return state.permissions
}

const selectPermissionsByIdResourcePersistentMap = createSelector(
    selectPermissions,
    (state) => state.permissionsForResourceByIdPersistent
)

export const makeSelectPermissionsByIdResourcePersistent = () => {
    const selector = createSelector(
        [
            selectPermissionsByIdResourcePersistentMap,
            (_state, idPersistent: string) => idPersistent
        ],
        (state, idPersistent) => state[idPersistent]
    )
    return selector
}
