import { Entity } from '../../table/state'
import { Remote } from '../../util/state'
import { MergeRequest } from '../state'

export class TagInstance {
    idPersistent: string
    version: number
    value: string

    constructor({
        idPersistent,
        version,
        value
    }: {
        idPersistent: string
        version: number
        value: string
    }) {
        this.idPersistent = idPersistent
        this.version = version
        this.value = value
    }
}

export class MergeRequestConflict {
    entity: Entity
    tagInstanceOrigin: TagInstance
    tagInstanceDestination?: TagInstance
    replace?: boolean
    constructor({
        entity,
        tagInstanceOrigin,
        tagInstanceDestination,
        replace = undefined
    }: {
        entity: Entity
        tagInstanceOrigin: TagInstance
        tagInstanceDestination?: TagInstance
        replace?: boolean
    }) {
        this.entity = entity
        this.tagInstanceOrigin = tagInstanceOrigin
        this.tagInstanceDestination = tagInstanceDestination
        this.replace = replace
    }
}

export class MergeRequestConflictsByState {
    updated: Remote<MergeRequestConflict>[]
    conflicts: Remote<MergeRequestConflict>[]
    mergeRequest: MergeRequest
    updatedEntityIdMap: Map<string, number>
    conflictsEntityIdMap: Map<string, number>

    constructor({
        updated,
        conflicts,
        mergeRequest,
        updatedEntityIdMap,
        conflictsEntityIdMap
    }: {
        updated: Remote<MergeRequestConflict>[]
        conflicts: Remote<MergeRequestConflict>[]
        mergeRequest: MergeRequest
        updatedEntityIdMap?: Map<string, number>
        conflictsEntityIdMap?: Map<string, number>
    }) {
        this.updated = updated
        this.conflicts = conflicts
        this.mergeRequest = mergeRequest
        if (
            updatedEntityIdMap === undefined ||
            updated.length != updatedEntityIdMap.size
        ) {
            this.updatedEntityIdMap = new Map(
                updated.map((entry, idx) => [entry.value.entity.idPersistent, idx])
            )
        } else {
            this.updatedEntityIdMap = updatedEntityIdMap
        }
        if (
            conflictsEntityIdMap === undefined ||
            conflicts.length != conflictsEntityIdMap.size
        ) {
            this.conflictsEntityIdMap = new Map(
                conflicts.map((entry, idx) => [entry.value.entity.idPersistent, idx])
            )
        } else {
            this.conflictsEntityIdMap = conflictsEntityIdMap
        }
    }
}

export class MergeRequestConflictResolutionState {
    conflicts: Remote<MergeRequestConflictsByState | undefined>
    startMerge: Remote<boolean>

    constructor(
        conflicts: Remote<MergeRequestConflictsByState | undefined>,
        startMerge: Remote<boolean>
    ) {
        this.conflicts = conflicts
        this.startMerge = startMerge
    }
}
