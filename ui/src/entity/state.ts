import { TagDefinition } from '../column_menu/state'
import { TagInstance } from '../contribution/entity/state'
import { newRemote, RemoteInterface } from '../util/state'

export interface BaseEntity {
    idPersistent: string
    displayTxt?: string
    version: number
}

export interface Entity extends BaseEntity {
    disabled: boolean
    justificationTxt: string | undefined
    displayTxtDetails: string | TagDefinition
}

export function newEntity({
    idPersistent,
    displayTxt,
    version,
    disabled,
    justificationTxt = undefined,
    displayTxtDetails = 'Display Text'
}: {
    idPersistent: string
    displayTxt?: string
    version: number
    disabled: boolean
    justificationTxt?: string | undefined
    displayTxtDetails?: string | TagDefinition
}) {
    return {
        idPersistent: idPersistent,
        displayTxt: displayTxt,
        version: version,
        disabled: disabled,
        justificationTxt: justificationTxt,
        displayTxtDetails: displayTxtDetails
    }
}
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
    entityByIdPersistentMap: { [key: string]: RemoteInterface<Entity | undefined> }
}

export function newEntityDetailsState({
    showEntityDetails = undefined,
    entityDetails = newRemote(undefined),
    entitySearchResults = newRemote(undefined),
    entityByIdPersistentMap = {}
}: {
    showEntityDetails?: string | undefined
    entityDetails?: RemoteInterface<EntityDetails | undefined>
    entitySearchResults?: RemoteInterface<EntitySearchResult[] | undefined>
    entityByIdPersistentMap?: { [key: string]: RemoteInterface<Entity | undefined> }
}): EntityDetailsState {
    return {
        showEntityDetails,
        entityDetails,
        entitySearchResults,
        entityByIdPersistentMap
    }
}
