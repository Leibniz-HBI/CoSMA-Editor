import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { newRemote } from '../../util/state'
import { DisplayTxtManagementState } from './state'
import { TagDefinition } from '../../column_menu/state'

const initialState: DisplayTxtManagementState = { tagDefinitions: newRemote([]) }

const displayTxtManagementSlice = createSlice({
    name: 'displayTxtManagement',
    initialState,
    reducers: {
        getDisplayTxtTagDefinitionsStart(state: DisplayTxtManagementState) {
            state.tagDefinitions.isLoading = true
        },
        getDisplayTxtTagDefinitionsSuccess(
            state: DisplayTxtManagementState,
            action: PayloadAction<TagDefinition[]>
        ) {
            state.tagDefinitions = newRemote(action.payload)
        },
        getDisplayTxtTagDefinitionsError(state: DisplayTxtManagementState) {
            state.tagDefinitions.isLoading = false
        },
        appendTagDefinition(
            state: DisplayTxtManagementState,
            action: PayloadAction<TagDefinition>
        ) {
            state.tagDefinitions.value.push(action.payload)
        },
        removeTagDefinition(
            state: DisplayTxtManagementState,
            action: PayloadAction<TagDefinition>
        ) {
            const idx = state.tagDefinitions.value.findIndex(
                (tagDef: TagDefinition) =>
                    tagDef.idPersistent == action.payload.idPersistent
            )
            state.tagDefinitions.value.splice(idx, 1)
        }
    }
})
export const displayTxtManagementReducer = displayTxtManagementSlice.reducer

export const {
    getDisplayTxtTagDefinitionsStart,
    getDisplayTxtTagDefinitionsSuccess,
    getDisplayTxtTagDefinitionsError,
    appendTagDefinition,
    removeTagDefinition
} = displayTxtManagementSlice.actions
