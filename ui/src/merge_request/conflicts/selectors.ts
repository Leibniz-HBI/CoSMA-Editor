import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'

function selectColumnMergeRequestConflicts(state: RootState) {
    return state.columnMergeRequestConflicts
}

export const selectColumnMergeRequestConflictsByCategory = createSelector(
    selectColumnMergeRequestConflicts,
    (state) => state.conflicts
)

export const selectStartMerge = createSelector(
    selectColumnMergeRequestConflicts,
    (state) => state.startMerge
)

export const selectResolvedCount = createSelector(
    selectColumnMergeRequestConflicts,
    (state) => {
        let numResolved
        if (state.conflicts.value !== undefined) {
            numResolved = 0
            for (let idx = 0; idx < state.conflicts.value.conflicts.length; ++idx) {
                if (
                    state.conflicts.value.conflicts[idx].value?.replacementState !==
                    undefined
                ) {
                    numResolved++
                }
            }
        }
        return [numResolved, state.conflicts.value?.conflicts.length]
    }
)

export const selectConflictsMergeRequest = createSelector(
    selectColumnMergeRequestConflictsByCategory,
    (state) => state.value?.mergeRequest
)

export const selectDisableOriginOnMerge = createSelector(
    selectConflictsMergeRequest,
    (state) => state?.disableOriginOnMerge ?? false
)
