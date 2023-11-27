import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { findIndexInSorted } from '../../util/sorted'
import { AppDispatch } from '../../store'
import { GridSelection } from '@glideapps/glide-data-grid'

export interface TableSelectionState {
    rows: number[]
    cols: number[]
    /**
     * List of selected cells, rows first in each entry
     */
    cells: [number, number][]
    rowSelectionOrder: number[]
}

const initialState: TableSelectionState = {
    rows: [],
    cols: [],
    cells: [],
    rowSelectionOrder: []
}

export const tableSelectionSlice = createSlice({
    name: 'tableSelection',
    initialState,
    reducers: {
        toggleRowSelection(
            state: TableSelectionState,
            action: PayloadAction<number[]>
        ) {
            if (action.payload.length == 0) {
                state.rows = []
                state.rowSelectionOrder = []
            }
            for (const val of action.payload) {
                const idx = findIndexInSorted(state.rows, val, (val) => val)
                if (state.rows[idx] == val) {
                    const removedValue = state.rows.splice(idx, 1)[0]
                    for (
                        let orderIdx = 0;
                        orderIdx < state.rowSelectionOrder.length;
                        ++orderIdx
                    ) {
                        if (state.rowSelectionOrder[orderIdx] == removedValue) {
                            state.rowSelectionOrder.splice(orderIdx, 1)
                        }
                    }
                } else {
                    state.rows.splice(idx, 0, val)
                    state.rowSelectionOrder.push(val)
                }
                state.cells = []
                state.cols = []
            }
        }
    }
})

export const { toggleRowSelection } = tableSelectionSlice.actions

export function mkGridSelectionCallback(dispatch: AppDispatch) {
    return (selection: GridSelection) => {
        if (selection.current !== undefined) {
            return
        }
        if (selection.columns.length > 0) {
            return
        }
        dispatch(toggleRowSelection(selection.rows.toArray()))
    }
}
