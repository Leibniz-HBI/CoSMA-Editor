import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    MergeRequestConflict,
    MergeRequestConflictResolutionState,
    newMergeRequestConflictResolutionState,
    newMergeRequestConflictsByState
} from './state'
import { newRemote, RemoteInterface } from '../../util/state'
import { MergeRequest } from '../state'

const tagMergeRequestConflictsSlice = createSlice({
    name: 'tagMergeRequestConflicts',
    initialState: newMergeRequestConflictResolutionState({}),
    reducers: {
        getMergeRequestConflictStart: (state: MergeRequestConflictResolutionState) => {
            state.conflicts.isLoading = true
        },
        getMergeRequestConflictSuccess: (
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<{
                updated: MergeRequestConflict[]
                conflicts: MergeRequestConflict[]
                mergeRequest: MergeRequest
            }>
        ) => {
            state.conflicts.isLoading = false
            state.conflicts.value = newMergeRequestConflictsByState({
                updated: action.payload.updated.map((conflict) => newRemote(conflict)),
                conflicts: action.payload.conflicts.map((conflict) =>
                    newRemote(conflict)
                ),

                mergeRequest: action.payload.mergeRequest
            })
        },
        getMergeRequestConflictError(state: MergeRequestConflictResolutionState) {
            state.conflicts.isLoading = false
        },
        resolveConflictStart: (
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<string>
        ) => {
            processConflicts(
                state,
                (conflict) => {
                    conflict.isLoading = true
                    return false
                },
                action.payload
            )
        },
        resolveConflictSuccess: (
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<{ idEntityPersistent: string; replace: boolean }>
        ) => {
            processConflicts(
                state,
                (conflict) => {
                    conflict.isLoading = false
                    conflict.value.replace = action.payload.replace
                    return true
                },
                action.payload.idEntityPersistent
            )
        },
        resolveConflictError: (
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<string>
        ) => {
            processConflicts(
                state,
                (conflict) => {
                    conflict.isLoading = false
                    return false
                },
                action.payload
            )
        },
        startMergeStart: (state: MergeRequestConflictResolutionState) => {
            state.startMerge.isLoading = true
        },
        startMergeSuccess: (state: MergeRequestConflictResolutionState) => {
            state.startMerge.isLoading = false
        },
        startMergeError: (state: MergeRequestConflictResolutionState) => {
            state.startMerge.isLoading = false
        },
        toggleDisableOnMergeStart: (state: MergeRequestConflictResolutionState) => {
            state.disableOriginOnMerge.isLoading = true
        },
        toggleDisableOnMergeSuccess: (
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<boolean>
        ) => {
            state.disableOriginOnMerge.isLoading = false
            if (state.conflicts.value !== undefined) {
                state.conflicts.value.mergeRequest.disableOriginOnMerge = action.payload
            }
        },
        toggleDisableOnMergeError: (state: MergeRequestConflictResolutionState) => {
            state.disableOriginOnMerge.isLoading = false
        }
    }
})

function processConflicts(
    state: MergeRequestConflictResolutionState,
    strategy: (conflict: RemoteInterface<MergeRequestConflict>) => boolean,
    idEntityPersistent: string
) {
    if (state.conflicts.value === undefined) {
        return
    }
    const updatedIdx = state.conflicts.value.updatedEntityIdMap[idEntityPersistent]
    if (updatedIdx !== undefined) {
        const updated = state.conflicts.value.updated[updatedIdx]
        if (updated !== undefined) {
            const doRemove = strategy(updated)
            if (doRemove) {
                state.conflicts.value.updated.splice(updatedIdx, 1)
                state.conflicts.value.updatedEntityIdMap = Object.fromEntries(
                    state.conflicts.value?.updated.map((val, idx) => [
                        val.value.entity.idPersistent,
                        idx
                    ])
                )
            }
        }
    }
    const entityIdx = state.conflicts.value?.conflictsEntityIdMap[idEntityPersistent]
    if (entityIdx !== undefined) {
        const conflict = state.conflicts.value?.conflicts[entityIdx]
        if (conflict !== undefined) {
            strategy(conflict)
        }
    }
}
export const tagMergeRequestConflictsReducer = tagMergeRequestConflictsSlice.reducer

export const {
    getMergeRequestConflictStart,
    getMergeRequestConflictSuccess,
    getMergeRequestConflictError,
    resolveConflictStart,
    resolveConflictSuccess,
    resolveConflictError,
    startMergeStart,
    startMergeSuccess,
    startMergeError,
    toggleDisableOnMergeStart,
    toggleDisableOnMergeSuccess,
    toggleDisableOnMergeError
} = tagMergeRequestConflictsSlice.actions
