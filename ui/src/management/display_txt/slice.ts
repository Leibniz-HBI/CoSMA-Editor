import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { newRemote } from '../../util/state'
import { DisplayTxtManagementState } from './state'
import { Column } from '../../column_menu/state'

const initialState: DisplayTxtManagementState = { columns: newRemote([]) }

const displayTxtManagementSlice = createSlice({
    name: 'displayTxtManagement',
    initialState,
    reducers: {
        getDisplayTxtColumnsStart(state: DisplayTxtManagementState) {
            state.columns.isLoading = true
        },
        getDisplayTxtColumnsSuccess(
            state: DisplayTxtManagementState,
            action: PayloadAction<Column[]>
        ) {
            state.columns = newRemote(action.payload)
        },
        getDisplayTxtColumnsError(state: DisplayTxtManagementState) {
            state.columns.isLoading = false
        },
        appendColumn(
            state: DisplayTxtManagementState,
            action: PayloadAction<Column>
        ) {
            state.columns.value.push(action.payload)
        },
        removeColumn(
            state: DisplayTxtManagementState,
            action: PayloadAction<Column>
        ) {
            const idx = state.columns.value.findIndex(
                (column: Column) =>
                    column.idPersistent == action.payload.idPersistent
            )
            state.columns.value.splice(idx, 1)
        }
    }
})
export const displayTxtManagementReducer = displayTxtManagementSlice.reducer

export const {
    getDisplayTxtColumnsStart,
    getDisplayTxtColumnsSuccess,
    getDisplayTxtColumnsError,
    appendColumn,
    removeColumn
} = displayTxtManagementSlice.actions
