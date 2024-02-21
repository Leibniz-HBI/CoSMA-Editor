import { TagDefinition } from '../column_menu/state'
import { PublicUserInfo } from '../user/state'
import { RemoteInterface, newRemote } from '../util/state'

export enum MergeRequestStep {
    Open = 'Open',
    Conflicts = 'Conflicts',
    Closed = 'Closed',
    Resolved = 'Resolved',
    Merged = 'Merged',
    Error = 'Error'
}

export interface MergeRequest {
    idPersistent: string
    createdBy: PublicUserInfo
    assignedTo: PublicUserInfo
    originTagDefinition: TagDefinition
    destinationTagDefinition: TagDefinition
    disableOriginOnMerge: boolean
    step: MergeRequestStep
}
export function newMergeRequest({
    idPersistent,
    createdBy,
    assignedTo,
    originTagDefinition,
    destinationTagDefinition,
    disableOriginOnMerge,
    step
}: {
    idPersistent: string
    createdBy: PublicUserInfo
    assignedTo: PublicUserInfo
    originTagDefinition: TagDefinition
    destinationTagDefinition: TagDefinition
    disableOriginOnMerge: boolean
    step: MergeRequestStep
}) {
    return {
        idPersistent: idPersistent,
        createdBy: createdBy,
        assignedTo: assignedTo,
        originTagDefinition: originTagDefinition,
        destinationTagDefinition: destinationTagDefinition,
        disableOriginOnMerge,
        step: step
    }
}

export interface MergeRequestByCategory {
    created: MergeRequest[]
    assigned: MergeRequest[]
}
export function newMergeRequestByCategory({
    created = [],
    assigned = []
}: {
    created?: MergeRequest[]
    assigned?: MergeRequest[]
}) {
    return {
        created: created,
        assigned: assigned
    }
}

export interface MergeRequestState {
    byCategory: RemoteInterface<MergeRequestByCategory>
}
export function newMergeRequestState({
    byCategory = newRemote(newMergeRequestByCategory({}))
}: {
    byCategory?: RemoteInterface<MergeRequestByCategory>
}) {
    return {
        byCategory: byCategory
    }
}
