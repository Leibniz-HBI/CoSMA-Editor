import { TagInstance } from '../contribution/entity/state'
import { Entity } from '../table/state'
import { newRemote, RemoteInterface } from '../util/state'

export interface EntityDetails {
    entity: Entity
    tagInstanceList: TagInstance[]
}

export interface EntityDetailsState {
    showEntityDetails: string | undefined
    entityDetails: RemoteInterface<EntityDetails | undefined>
}

export function newEntityDetailsState({
    showEntityDetails = undefined,
    entityDetails = newRemote(undefined)
}: {
    showEntityDetails?: string | undefined
    entityDetails?: RemoteInterface<EntityDetails | undefined>
}): EntityDetailsState {
    return { showEntityDetails, entityDetails }
}
