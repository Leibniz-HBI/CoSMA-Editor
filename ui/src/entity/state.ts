import { TagInstance } from '../contribution/entity/state'
import { Entity } from '../table/state'
import { newRemote, RemoteInterface } from '../util/state'

export interface EntityDetails {
    entity: Entity
    tagInstanceList: TagInstance[]
}

export interface EntitySearchResult {
    idEntityPersistent: string
    idTagDefinitionPersistent: string | undefined
    matchValue: string
}

export function newEntitySearchResult({
    idEntityPersistent,
    idTagDefinitionPersistent = undefined,
    matchValue
}: {
    idEntityPersistent: string
    idTagDefinitionPersistent?: string | undefined
    matchValue: string
}): EntitySearchResult {
    return { idEntityPersistent, idTagDefinitionPersistent, matchValue }
}

export function newEntityDetails({
    entity,
    tagInstanceList = []
}: {
    entity: Entity
    tagInstanceList?: TagInstance[]
}): EntityDetails {
    return {
        entity,
        tagInstanceList
    }
}

export interface EntityDetailsState {
    showEntityDetails: string | undefined
    entityDetails: RemoteInterface<EntityDetails | undefined>
    entitySearchResults: RemoteInterface<EntitySearchResult[] | undefined>
}

export function newEntityDetailsState({
    showEntityDetails = undefined,
    entityDetails = newRemote(undefined),
    entitySearchResults = newRemote(undefined)
}: {
    showEntityDetails?: string | undefined
    entityDetails?: RemoteInterface<EntityDetails | undefined>
    entitySearchResults?: RemoteInterface<EntitySearchResult[] | undefined>
}): EntityDetailsState {
    return { showEntityDetails, entityDetails, entitySearchResults }
}
