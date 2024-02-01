import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState,
    ColumnsTuple,
    newColumnDefinitionsContributionState
} from './state'
import { newRemote, Remote } from '../../util/state'
import { findIndexInSorted } from '../../util/sorted'

const initialState: ColumnDefinitionsContributionState =
    newColumnDefinitionsContributionState({})

export const contributionColumnDefinitionSlice = createSlice({
    name: 'contributionColumnDefinition',
    initialState,
    reducers: {
        setColumnDefinitionFormTab(
            state: ColumnDefinitionsContributionState,
            action: PayloadAction<boolean>
        ) {
            state.createTabSelected = action.payload
        },
        columnDefinitionContributionSelect(
            state: ColumnDefinitionsContributionState,
            action: PayloadAction<ColumnDefinitionContribution>
        ) {
            state.selectedColumnDefinition = newRemote(action.payload)
        },
        patchColumnDefinitionContributionStart(
            state: ColumnDefinitionsContributionState
        ) {
            state.selectedColumnDefinition.isLoading = true
        },
        patchColumnDefinitionContributionSuccess(
            state: ColumnDefinitionsContributionState,
            action: PayloadAction<ColumnDefinitionContribution>
        ) {
            if (state.columns.value === undefined) {
                return state
            }
            const activeDefs = state.columns.value.activeDefinitionsList
            const discardedDefs = state.columns.value.discardedDefinitionsList
            const activeIdx = findIndexInSorted(
                activeDefs,
                action.payload,
                lineIndexSortKey
            )
            if (activeDefs[activeIdx]?.idPersistent == action.payload.idPersistent) {
                // new column definition was active before
                if (!action.payload.discard) {
                    // new column definition is still active
                    activeDefs[activeIdx] = action.payload
                } else {
                    // new column definition is not active anymore
                    activeDefs.splice(activeIdx, 1)
                    const passiveIdx = findIndexInSorted(
                        discardedDefs,
                        action.payload,
                        lineIndexSortKey
                    )
                    discardedDefs.splice(passiveIdx, 0, action.payload)
                }
            } else {
                // new column definition was not in active
                const discardIdx = findIndexInSorted(
                    discardedDefs,
                    action.payload,
                    lineIndexSortKey
                )
                if (
                    discardedDefs[discardIdx]?.idPersistent !=
                    action.payload.idPersistent
                ) {
                    // neither in active nor discarded. Do nothing
                    return state
                }
                if (action.payload.discard) {
                    // new column definition is discarded
                    discardedDefs[discardIdx] = action.payload
                } else {
                    // new column definition is active
                    discardedDefs.splice(discardIdx, 1)
                    activeDefs.splice(activeIdx, 0, action.payload)
                }
            }
            state.selectedColumnDefinition = newRemote(action.payload)
        },
        loadColumnDefinitionsContributionStart(
            state: ColumnDefinitionsContributionState
        ) {
            state.columns.isLoading = true
            state.selectedColumnDefinition = newRemote(undefined)
        },
        loadColumnDefinitionsContributionSuccess(
            state: ColumnDefinitionsContributionState,
            action: PayloadAction<ColumnsTuple>
        ) {
            state.columns = newRemote(action.payload)
            state.selectedColumnDefinition = newRemote(
                action.payload.activeDefinitionsList[0] ??
                    action.payload.discardedDefinitionsList[0]
            )
            state.createTabSelected = false
        },
        finalizeColumnAssignmentStart(state: ColumnDefinitionsContributionState) {
            state.finalizeColumnAssignment = newRemote(false, true)
        },
        finalizeColumnAssignmentSuccess(state: ColumnDefinitionsContributionState) {
            state.finalizeColumnAssignment = new Remote(true)
        },
        finalizeColumnAssignmentError(state: ColumnDefinitionsContributionState) {
            state.finalizeColumnAssignment.isLoading = false
        },
        loadColumnDefinitionsContributionError(
            state: ColumnDefinitionsContributionState
        ) {
            state.columns.isLoading = false
        },
        patchColumnDefinitionContributionError(
            state: ColumnDefinitionsContributionState
        ) {
            state.selectedColumnDefinition.isLoading = false
        }
    }
})

export const {
    columnDefinitionContributionSelect,
    finalizeColumnAssignmentStart,
    finalizeColumnAssignmentSuccess,
    finalizeColumnAssignmentError,
    loadColumnDefinitionsContributionStart,
    loadColumnDefinitionsContributionSuccess,
    loadColumnDefinitionsContributionError,
    patchColumnDefinitionContributionStart,
    patchColumnDefinitionContributionSuccess,
    patchColumnDefinitionContributionError,
    setColumnDefinitionFormTab
} = contributionColumnDefinitionSlice.actions

export default contributionColumnDefinitionSlice.reducer

export function lineIndexSortKey(columnDefinition: ColumnDefinitionContribution) {
    return columnDefinition.indexInFile
}
