import { Entity } from '../../table/state'
import { PublicUserInfo } from '../../user/state'
import { RemoteInterface } from '../../util/state'

export enum EntityMergeRequestStep {
    OPEN = 'open',
    CLOSED = 'closed',
    MERGED = 'merged',
    ERROR = 'error'
}

export interface EntityMergeRequest {
    entityOrigin: Entity
    entityDestination: Entity
    createdBy: PublicUserInfo
    state: EntityMergeRequestStep
    idPersistent: string
}

export function newEntityMergeRequest(args: {
    idPersistent: string
    entityOrigin: Entity
    entityDestination: Entity
    createdBy: PublicUserInfo
    state: EntityMergeRequestStep
}): EntityMergeRequest {
    return args
}
export interface EntityMergeRequestState {
    entityMergeRequests: RemoteInterface<EntityMergeRequest[] | undefined>
}
