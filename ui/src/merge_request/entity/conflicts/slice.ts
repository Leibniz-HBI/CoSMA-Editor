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
    newlyCreated: false
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
    getEntityMergeRequestError
} = entityMergeRequestConflictSlice.actions
