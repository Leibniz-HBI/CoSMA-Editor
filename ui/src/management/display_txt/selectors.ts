import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { Column } from '../../column_menu/state'

function selectDisplayTxtManagement(state: RootState) {
    return state.displayTxtManagement
}

export const selectDisplayTxtColumn = createSelector(
    selectDisplayTxtManagement,
    (state) => state.columns
)

export const selectDisplayTxtColumnIdPersistentSet = createSelector(
    selectDisplayTxtColumn,
    (state) =>
        Object.fromEntries(
            state.value.map((column: Column) => [column.idPersistent, true])
        )
)
