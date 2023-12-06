import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    EntityMergeRequestConflictsState,
    EntityMergeRequestConflicts,
    EntityMergeRequestConflict
} from './state'
import { EntityMergeRequest } from '../state'
import { newRemote, RemoteInterface } from '../../../util/state'

const initialState: EntityMergeRequestConflictsState = {
    conflicts: newRemote(undefined),
    mergeRequest: newRemote(undefined),
    newlyCreated: false,
    reverseOriginDestination: newRemote(undefined),
    merge: newRemote(undefined)
}
export const entityMergeRequestConflictSlice = createSlice({
    name: 'entityMergeRequestConflicts',
    initialState,
    reducers: {
        putEntityMergeRequestStart(state: EntityMergeRequestConflictsState) {
            state.mergeRequest = newRemote(undefined, true)
        },
        putEntityMergeRequestSuccess(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<{
                newlyCreated: boolean
                mergeRequest: EntityMergeRequest
            }>
        ) {
            state.mergeRequest = newRemote(action.payload.mergeRequest)
            state.newlyCreated = action.payload.newlyCreated
        },
        putEntityMergeRequestError(state: EntityMergeRequestConflictsState) {
            state.newlyCreated = false
            state.mergeRequest.isLoading = false
        },
        getEntityMergeRequestConflictsStart(state: EntityMergeRequestConflictsState) {
            state.conflicts = newRemote(undefined, true)
        },
        getEntityMergeRequestConflictsSuccess(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<EntityMergeRequestConflicts>
        ) {
            state.conflicts = newRemote(action.payload)
        },
        getEntityMergeRequestConflictsError(state: EntityMergeRequestConflictsState) {
            state.conflicts.isLoading = false
        },
        resolveEntityConflictStart(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            updateRelevantEntityConflict(state, action.payload, (conflict) => {
                conflict.isLoading = false
                conflict.errorMsg = undefined
            })
        },
        resolveEntityConflictSuccess(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<[string, boolean]>
        ) {
            const [idTagDefinitionPersistent, replace] = action.payload
            const conflicts = state.conflicts.value
            if (conflicts === undefined) {
                return
            }
            const updatedIdx =
                conflicts.updatedTagDefinitionIdMap[idTagDefinitionPersistent]
            if (updatedIdx !== undefined) {
                conflicts.updated.splice(updatedIdx, 1)
            }
            conflicts.updatedTagDefinitionIdMap = Object.fromEntries(
                conflicts.updated.map((updatedConflict, idx) => [
                    updatedConflict.value.tagDefinition.idPersistent,
                    idx
                ])
            )
            updateRelevantEntityConflict(
                state,
                idTagDefinitionPersistent,
                (conflict) => {
                    conflict.isLoading = false
                    conflict.value.replace = replace
                }
            )
        },
        resolveEntityConflictError(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            updateRelevantEntityConflict(state, action.payload, (conflict) => {
                conflict.isLoading = false
            })
        },
        getEntityMergeRequestStart(state: EntityMergeRequestConflictsState) {
            state.mergeRequest.isLoading = true
            state.mergeRequest.errorMsg = undefined
        },
        getEntityMergeRequestSuccess(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<EntityMergeRequest>
        ) {
            state.mergeRequest = newRemote(action.payload)
            state.conflicts = newRemote(undefined)
            state.newlyCreated = false
        },
        getEntityMergeRequestError(state: EntityMergeRequestConflictsState) {
            state.mergeRequest.isLoading = false
        },
        reverseOriginDestinationStart(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            state.reverseOriginDestination = newRemote(action.payload, true)
        },
        reverseOriginDestinationSuccess(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<EntityMergeRequest>
        ) {
            if (state.reverseOriginDestination.value === action.payload.idPersistent) {
                state.reverseOriginDestination.isLoading = false
            }
            if (
                state.mergeRequest.value?.idPersistent === action.payload.idPersistent
            ) {
                state.mergeRequest = newRemote(action.payload)
            }
        },
        reverseOriginDestinationError(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            if (state.reverseOriginDestination.value === action.payload) {
                state.reverseOriginDestination.isLoading = false
            }
        },
        mergeEntityMergeRequestStart(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            state.merge = newRemote(action.payload, true)
        },
        mergeEntityMergeRequestSuccess(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            if (state.merge.value == action.payload) {
                state.merge.isLoading = false
                state.merge.errorMsg == undefined
            }
        },
        mergeEntityMergeRequestError(
            state: EntityMergeRequestConflictsState,
            action: PayloadAction<string>
        ) {
            if (state.merge.value == action.payload) {
                state.merge.isLoading = false
            }
        },
        clearEntityMergeState(state: EntityMergeRequestConflictsState) {
            state.merge = newRemote(undefined)
        }
    }
})

function updateRelevantEntityConflict(
    state: EntityMergeRequestConflictsState,
    idTagDefinitionPersistent: string,
    strategy: (conflict: RemoteInterface<EntityMergeRequestConflict>) => void
) {
    if (state.conflicts.value === undefined) {
        return
    }
    const conflictIdx =
        state.conflicts.value.resolvableConflictsTagDefinitionIdMap[
            idTagDefinitionPersistent
        ]
    if (conflictIdx !== undefined) {
        strategy(state.conflicts.value.resolvableConflicts[conflictIdx])
    }
}

export const {
    putEntityMergeRequestStart,
    putEntityMergeRequestSuccess,
    putEntityMergeRequestError,
    getEntityMergeRequestConflictsStart,
    getEntityMergeRequestConflictsSuccess,
    getEntityMergeRequestConflictsError,
    resolveEntityConflictStart,
    resolveEntityConflictSuccess,
    resolveEntityConflictError,
    getEntityMergeRequestStart,
    getEntityMergeRequestSuccess,
    getEntityMergeRequestError,
    reverseOriginDestinationStart,
    reverseOriginDestinationSuccess,
    reverseOriginDestinationError,
    mergeEntityMergeRequestStart,
    mergeEntityMergeRequestSuccess,
    mergeEntityMergeRequestError,
    clearEntityMergeState
} = entityMergeRequestConflictSlice.actions
