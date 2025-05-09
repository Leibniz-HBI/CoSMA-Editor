import { RemoteInterface, newRemote } from '../../../util/state'
import { Value, ReplacementState } from '../../conflicts/state'
import { EntityMergeRequest } from '../state'

export interface Column {
    curated: boolean
    idPersistent: string
    idParentPersistent: string
    namePath: string[]
    version: number
}

export interface EntityMergeRequestConflict {
    column: Column
    valueOrigin: Value
    valueDestination?: Value
    replacementState?: ReplacementState
    replacementValue?: string
}

export function newEntityMergeRequestConflict({
    column: column,
    valueOrigin,
    valueDestination = undefined,
    replacementState,
    replacementValue = undefined
}: {
    column: Column
    valueOrigin: Value
    valueDestination?: Value
    replacementState?: ReplacementState
    replacementValue?: string
}): EntityMergeRequestConflict {
    return {
        column: column,
        valueOrigin,
        valueDestination,
        replacementState,
        replacementValue
    }
}

export interface EntityMergeRequestConflicts {
    resolvableConflicts: RemoteInterface<EntityMergeRequestConflict>[]
    unresolvableConflicts: RemoteInterface<EntityMergeRequestConflict>[]
    updated: RemoteInterface<EntityMergeRequestConflict>[]
    updatedColumnIdMap: { [key: string]: number }
    resolvableConflictsColumnIdMap: { [key: string]: number }
}

export interface EntityMergeRequestConflictsState {
    conflicts: RemoteInterface<EntityMergeRequestConflicts | undefined>
    mergeRequest: RemoteInterface<EntityMergeRequest | undefined>
    newlyCreated: boolean
    reverseOriginDestination: RemoteInterface<string | undefined>
    merge: RemoteInterface<string | undefined>
}

export function newEntityMergeRequestConflictsState({
    conflicts = newRemote(undefined),
    mergeRequest = newRemote(undefined),
    newlyCreated = false,
    reverseOriginDestination = newRemote(undefined),
    merge = newRemote(undefined)
}: {
    conflicts?: RemoteInterface<EntityMergeRequestConflicts | undefined>
    mergeRequest?: RemoteInterface<EntityMergeRequest | undefined>
    newlyCreated?: boolean
    reverseOriginDestination?: RemoteInterface<string | undefined>
    merge?: RemoteInterface<string | undefined>
}): EntityMergeRequestConflictsState {
    return { conflicts, mergeRequest, newlyCreated, reverseOriginDestination, merge }
}
