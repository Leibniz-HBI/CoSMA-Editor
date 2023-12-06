import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../../store'

function selectEntityMergeRequestConflictsState(state: RootState) {
    return state.entityMergeRequestConflicts
}

export const selectEntityMergeRequest = createSelector(
    selectEntityMergeRequestConflictsState,
    (state) => state.mergeRequest
)

export const selectEntityMergeRequestConflicts = createSelector(
    selectEntityMergeRequestConflictsState,
    (state) => state.conflicts
)

export const selectEntityMerge = createSelector(
    selectEntityMergeRequestConflictsState,
    (state) => state.merge
)
