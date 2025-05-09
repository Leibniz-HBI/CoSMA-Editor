import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectColumnMergeRequestsState(state: RootState) {
    return state.columnMergeRequests
}
const selectRemoteByCategory = createSelector(
    selectColumnMergeRequestsState,
    (state) => state.byCategory
)

export const selectColumnMergeRequestsIsLoading = createSelector(
    selectRemoteByCategory,
    (state) => state.isLoading
)

export const selectColumnMergeRequestByCategory = createSelector(
    selectRemoteByCategory,
    (state) => state.value
)
