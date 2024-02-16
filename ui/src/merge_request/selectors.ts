import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectTagMergeRequestsState(state: RootState) {
    return state.tagMergeRequests
}
const selectRemoteByCategory = createSelector(
    selectTagMergeRequestsState,
    (state) => state.byCategory
)

export const selectTagMergeRequestsIsLoading = createSelector(
    selectRemoteByCategory,
    (state) => state.isLoading
)

export const selectTagMergeRequestByCategory = createSelector(
    selectRemoteByCategory,
    (state) => state.value
)
