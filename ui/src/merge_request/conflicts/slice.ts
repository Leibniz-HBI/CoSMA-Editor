import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    MergeRequestConflict,
    MergeRequestConflictResolutionState,
    newMergeRequestConflictResolutionState,
    newMergeRequestConflictsByState,
    ReplacementState
} from './state'
import { newRemote, RemoteInterface } from '../../util/state'
import { MergeRequest } from '../state'

const columnMergeRequestConflictsSlice = createSlice({
    name: 'columnMergeRequestConflicts',
    initialState: newMergeRequestConflictResolutionState({}),
    reducers: {
        getMergeRequestStart(state: MergeRequestConflictResolutionState) {
            state.mergeRequest.isLoading = true
        },
        getMergeRequestSuccess(
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<MergeRequest>
        ) {
            state.mergeRequest.isLoading = false
            state.mergeRequest.value = action.payload
        },
        getMergeRequestError(state: MergeRequestConflictResolutionState) {
            state.mergeRequest.isLoading = false
        },
        getMergeRequestConflictStart: (state: MergeRequestConflictResolutionState) => {
            state.conflicts.isLoading = true
        },
        getMergeRequestConflictSuccess: (
            state: MergeRequestConflictResolutionState,
            action: PayloadAction<{
                updated: MergeRequestConflict[]
                conflicts: MergeRequestConflict[]
            }>
        ) => {
            state.conflicts.isLoading = false
            state.conflicts.value = newMergeRequestConflictsByState({
                updated: action.payload.updated.map((conflict) => newRemote(conflict)),
                conflicts: action.payload.conflicts.map((conflict) =>
                    newRemote(conflict)
                )
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
            action: PayloadAction<{
                idEntityPersistent: string
                replacementState: ReplacementState | undefined
                replacementValue: string | undefined
            }>
        ) => {
            processConflicts(
                state,
                (conflict) => {
                    conflict.isLoading = false
                    const replacementState = action.payload.replacementState
                    const replacementValue = action.payload.replacementValue
                    conflict.value.replacementState = replacementState
                    conflict.value.replacementValue = replacementValue
                    return (
                        replacementState === ReplacementState.KEEP ||
                        replacementState === ReplacementState.REPLACE ||
                        (replacementState === ReplacementState.VALUE &&
                            !(
                                replacementValue === undefined ||
                                replacementValue === ''
                            ))
                    )
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
            if (state.mergeRequest.value !== undefined) {
                state.mergeRequest.value.disableOriginOnMerge = action.payload
            }
        },
        toggleDisableOnMergeError: (state: MergeRequestConflictResolutionState) => {
            state.disableOriginOnMerge.isLoading = false
        },
        clearMergeRequest: (state: MergeRequestConflictResolutionState) => {
            state.mergeRequest = newRemote(undefined)
            state.conflicts = newRemote(undefined)
            state.disableOriginOnMerge = newRemote(undefined)
            state.startMerge = newRemote(false)
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
export const columnMergeRequestConflictsReducer =
    columnMergeRequestConflictsSlice.reducer

export const {
    clearMergeRequest,
    getMergeRequestError,
    getMergeRequestStart,
    getMergeRequestSuccess,
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
} = columnMergeRequestConflictsSlice.actions
