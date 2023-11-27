import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'

function selectEntityMergeRequestsState(state: RootState) {
    return state.entityMergeRequests
}

export const selectEntityMergeRequests = createSelector(
    selectEntityMergeRequestsState,
    (state) => state.entityMergeRequests
)
