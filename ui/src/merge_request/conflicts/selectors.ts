import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { create } from 'node:domain'

function selectTagMergeRequestConflicts(state: RootState) {
    return state.tagMergeRequestConflicts
}

export const selectTagMergeRequestConflictsByCategory = createSelector(
    selectTagMergeRequestConflicts,
    (state) => state.conflicts
)

export const selectStartMerge = createSelector(
    selectTagMergeRequestConflicts,
    (state) => state.startMerge
)

export const selectResolvedCount = createSelector(
    selectTagMergeRequestConflicts,
    (state) => {
        let numResolved
        if (state.conflicts.value !== undefined) {
            numResolved = 0
            for (let idx = 0; idx < state.conflicts.value.conflicts.length; ++idx) {
                if (state.conflicts.value.conflicts[idx].value?.replace !== undefined) {
                    numResolved++
                }
            }
        }
        return [numResolved, state.conflicts.value?.conflicts.length]
    }
)

export const selectConflictsMergeRequest = createSelector(
    selectTagMergeRequestConflictsByCategory,
    (state) => state.value?.mergeRequest
)

export const selectDisableOriginOnMerge = createSelector(
    selectConflictsMergeRequest,
    (state) => state?.disableOriginOnMerge ?? false
)
