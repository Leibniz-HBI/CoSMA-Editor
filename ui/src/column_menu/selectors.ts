import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectTagSelection(state: RootState) {
    return state.tagSelection
}

export const selectNavigationEntries = createSelector(
    selectTagSelection,
    (state) => state.navigationEntries
)

export const selectTagSelectionLoading = createSelector(
    selectTagSelection,
    (state) => state.isLoading
)

export const selectTagSubmitError = createSelector(
    selectTagSelection,
    (state) => state.submissionErrorState
)
