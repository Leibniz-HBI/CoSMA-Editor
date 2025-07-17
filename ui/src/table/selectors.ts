import { createSelector } from '@reduxjs/toolkit'
import { AppDispatch, RootState } from '../store'
import { selectPermissionGroup } from '../auth/selectors'
import { removeSelectedColumn, columnChangeOwnershipShow } from './slice'
import { remoteUserProfileColumnDeleteAsync } from '../user/thunks'
import { UserPermissionGroup } from '../user/state'
import { curateAsync } from '../column_menu/thunks'
import { justificationColumnId } from './state'

function selectTableState(state: RootState) {
    return state.table
}
const selectColumnState = createSelector(
    selectTableState,
    (state) => state.columnStates
)

export const selectIsLoadingEntities = createSelector(
    selectTableState,
    (state) => state.isLoading
)

export const selectIsLoadingColumn = createSelector(selectColumnState, (state) => {
    for (const col of state) {
        if (col.cellContents.isLoading) {
            return true
        }
    }
    return false
})

export const selectEntities = createSelector(
    selectTableState,
    (state) => state.entities
)

export const selectEntityIndices = createSelector(
    selectTableState,
    (state) => state.entityIndices
)

export const selectColumnStates = createSelector(
    selectTableState,
    (state) => state.columnStates
)

export const selectColumnIndices = createSelector(
    selectTableState,
    (state) => state.columnIndices
)

export const selectShowSearch = createSelector(
    selectTableState,
    (state) => state.showSearch
)

export const selectShowEntityAddMenu = createSelector(
    selectTableState,
    (state) => state.showEntityAddDialog
)

export const selectShowColumnMenu = createSelector(
    selectTableState,
    (state) => state.showColumnAddMenu
)

export const selectEntityAddState = createSelector(
    selectTableState,
    (state) => state.entityAddState
)

export const selectShowEntityMerging = createSelector(
    selectTableState,
    (state) => state.showEntityMergingModal
)

export const selectFrozenColumns = createSelector(
    selectTableState,
    (state) => state.frozenColumns
)

export const selectSelectedColumnHeaderBounds = createSelector(
    selectTableState,
    (state) => state.selectedColumnHeaderBounds
)

export const selectSelectedColumnIdPersistent = createSelector(
    selectTableState,
    (state) => state.selectedColumnId
)

export const selectColumnHeaderMenu = createSelector(
    selectSelectedColumnIdPersistent,
    selectPermissionGroup,
    (idPersistent, permissionGroup) => {
        return (dispatch: AppDispatch) => {
            if (idPersistent === undefined) {
                return []
            }
            const ret = [
                {
                    label: 'Hide Column',
                    labelClassName: 'danger text-danger',
                    onClick: () => {
                        dispatch(removeSelectedColumn())
                        dispatch(remoteUserProfileColumnDeleteAsync(idPersistent))
                    }
                }
            ]
            if (idPersistent == justificationColumnId) {
                return ret
            }
            ret.push({
                label: 'Change Owner',
                labelClassName: '',
                onClick: () => dispatch(columnChangeOwnershipShow(idPersistent))
            })
            if (
                permissionGroup == UserPermissionGroup.EDITOR ||
                permissionGroup == UserPermissionGroup.COMMISSIONER
            ) {
                ret.push({
                    label: 'Curate Column',
                    labelClassName: '',
                    onClick: () => {
                        dispatch(curateAsync(idPersistent))
                    }
                })
            }
            return ret
        }
    }
)

export const selectOwnershipChangeColumnIdPersistent = createSelector(
    selectTableState,
    (state) => state.ownershipChangeColumnIdPersistent
)

export const selectIsSubmittingValues = createSelector(
    selectTableState,
    (state) => state.isSubmittingValues
)

export const selectShowEntityJustifications = createSelector(
    selectTableState,
    (state) => state.showEntityJustifications
)

export const selectEntityJustificationHistoryForIdPersistent = createSelector(
    selectTableState,
    (state) => state.showEntityJustificationHistoryForIdPersistent
)

export const selectEntityJustificationHistory = createSelector(
    selectTableState,
    (state) => state.entityJustificationHistory
)

export const makeSelectEntityByIdPersistent = () => {
    const selector = createSelector(
        [
            selectEntities,
            selectEntityIndices,
            (_state, idPersistent: string) => idPersistent
        ],
        (entities, entityIndices, idPersistent) =>
            entities?.[entityIndices[idPersistent]]
    )
    return selector
}

export const selectHistorySinceEpoch = createSelector(
    selectTableState,
    (state) => state.historyDateSinceEpoch
)
export const selectHistoryDate = createSelector(selectHistorySinceEpoch, (state) =>
    state === undefined ? undefined : new Date(state)
)
