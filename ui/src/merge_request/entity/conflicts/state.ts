import { RemoteInterface } from '../../../util/state'
import { TagInstance } from '../../conflicts/state'
import { EntityMergeRequest } from '../state'

export interface TagDefinition {
    curated: boolean
    idPersistent: string
    idParentPersistent: string
    namePath: string[]
    version: number
}

export interface EntityMergeRequestConflict {
    tagDefinition: TagDefinition
    tagInstanceOrigin: TagInstance
    tagInstanceDestination?: TagInstance
    replace: boolean | undefined
}

export function newEntityMergeRequestConflict({
    tagDefinition,
    tagInstanceOrigin,
    tagInstanceDestination = undefined,
    replace = undefined
}: {
    tagDefinition: TagDefinition
    tagInstanceOrigin: TagInstance
    tagInstanceDestination?: TagInstance
    replace?: boolean | undefined
}): EntityMergeRequestConflict {
    return {
        tagDefinition,
        tagInstanceOrigin,
        tagInstanceDestination,
        replace
    }
}

export interface EntityMergeRequestConflicts {
    resolvableConflicts: RemoteInterface<EntityMergeRequestConflict>[]
    unresolvableConflicts: RemoteInterface<EntityMergeRequestConflict>[]
    updated: RemoteInterface<EntityMergeRequestConflict>[]
    updatedTagDefinitionIdMap: { [key: string]: number }
    resolvableConflictsTagDefinitionIdMap: { [key: string]: number }
}

export interface EntityMergeRequestConflictsState {
    conflicts: RemoteInterface<EntityMergeRequestConflicts | undefined>
    mergeRequest: RemoteInterface<EntityMergeRequest | undefined>
    newlyCreated: boolean
    reverseOriginDestination: RemoteInterface<string | undefined>
    merge: RemoteInterface<string | undefined>
}
