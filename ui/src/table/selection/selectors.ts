import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { CompactSelection } from '@glideapps/glide-data-grid'

const selectTableSelectionState = (state: RootState) => state.tableSelection

export const selectRowSelectionOrder = createSelector(
    selectTableSelectionState,
    (state) => state.rowSelectionOrder
)
export const selectedRows = createSelector(
    selectTableSelectionState,
    (state) => state.rows
)

export const selectSelectedCurrent = createSelector(
    selectTableSelectionState,
    (state) => state.current
)

export const selectTableSelection = createSelector(
    selectedRows,
    selectSelectedCurrent,
    (rows, current) => {
        let selectedRows = CompactSelection.empty()
        const selectedCols = CompactSelection.empty()
        for (const idx of rows) {
            selectedRows = selectedRows.add(idx)
        }
        return {
            columns: selectedCols,
            current: current,
            rows: selectedRows
        }
    }
)
