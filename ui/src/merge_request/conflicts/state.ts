import { Entity } from '../../entity/state'
import { RemoteInterface, newRemote } from '../../util/state'
import { MergeRequest } from '../state'

export interface Value {
    idPersistent: string
    version: number
    value: string
}
export function newValue({
    idPersistent,
    version,
    value
}: {
    idPersistent: string
    version: number
    value: string
}) {
    return {
        idPersistent: idPersistent,
        version: version,
        value: value
    }
}

export enum ReplacementState {
    KEEP = 'KEEP',
    REPLACE = 'REPLACE',
    VALUE = 'VALUE'
}

export interface MergeRequestConflict {
    entity: Entity
    valueOrigin: Value
    valueDestination?: Value
    replacementState?: ReplacementState
    replacementValue?: string
}
export function newMergeRequestConflict({
    entity,
    valueOrigin,
    valueDestination,
    replacementState,
    replacementValue = undefined
}: {
    entity: Entity
    valueOrigin: Value
    valueDestination?: Value
    replacementState?: ReplacementState
    replacementValue?: string
}) {
    return {
        entity: entity,
        valueOrigin,
        valueDestination,
        replacementState,
        replacementValue
    }
}

export interface MergeRequestConflictsByState {
    updated: RemoteInterface<MergeRequestConflict>[]
    conflicts: RemoteInterface<MergeRequestConflict>[]
    mergeRequest: MergeRequest
    updatedEntityIdMap: { [key: string]: number }
    conflictsEntityIdMap: { [key: string]: number }
}

export function newMergeRequestConflictsByState({
    updated,
    conflicts,
    mergeRequest,
    updatedEntityIdMap,
    conflictsEntityIdMap
}: {
    updated: RemoteInterface<MergeRequestConflict>[]
    conflicts: RemoteInterface<MergeRequestConflict>[]
    mergeRequest: MergeRequest
    updatedEntityIdMap?: { [key: string]: number }
    conflictsEntityIdMap?: { [key: string]: number }
}): MergeRequestConflictsByState {
    let newUpdatedEntityIdMap = updatedEntityIdMap
    if (
        newUpdatedEntityIdMap === undefined ||
        updated.length != newUpdatedEntityIdMap.size
    ) {
        newUpdatedEntityIdMap = Object.fromEntries(
            updated.map((entry, idx) => [entry.value.entity.idPersistent, idx])
        )
    }
    let newConflictsEntityIdMap = conflictsEntityIdMap
    if (
        newConflictsEntityIdMap === undefined ||
        conflicts.length != newConflictsEntityIdMap.size
    ) {
        newConflictsEntityIdMap = Object.fromEntries(
            conflicts.map((entry, idx) => [entry.value.entity.idPersistent, idx])
        )
    }

    return {
        updated: updated,
        conflicts: conflicts,
        mergeRequest: mergeRequest,
        updatedEntityIdMap: newUpdatedEntityIdMap,
        conflictsEntityIdMap: newConflictsEntityIdMap
    }
}

export interface MergeRequestConflictResolutionState {
    conflicts: RemoteInterface<MergeRequestConflictsByState | undefined>
    startMerge: RemoteInterface<boolean>
    disableOriginOnMerge: RemoteInterface<undefined>
}
export function newMergeRequestConflictResolutionState({
    conflicts = newRemote(undefined),
    startMerge = newRemote(false),
    disableOriginOnMerge = newRemote(undefined)
}: {
    conflicts?: RemoteInterface<MergeRequestConflictsByState | undefined>
    startMerge?: RemoteInterface<boolean>
    disableOriginOnMerge?: RemoteInterface<undefined>
}) {
    return {
        conflicts: conflicts,
        startMerge: startMerge,
        disableOriginOnMerge
    }
}
