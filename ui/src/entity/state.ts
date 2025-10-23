import { Column } from '../column_menu/state'
import { Value } from '../contribution/entity/state'
import { newRemote, RemoteInterface } from '../util/state'

export interface BaseEntity {
    idPersistent: string
    displayTxt?: string
    version: number
}

export interface Entity extends BaseEntity {
    disabled: boolean
    justificationTxt: string | undefined
    displayTxtDetails: string | Column
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
    displayTxtDetails?: string | Column
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
    valueList: Value[]
}

export interface EntitySearchResult {
    idEntityPersistent: string
    idColumnPersistent: string | undefined
    matchValue: string
}

export function newEntitySearchResult({
    idEntityPersistent,
    idColumnPersistent = undefined,
    matchValue
}: {
    idEntityPersistent: string
    idColumnPersistent?: string | undefined
    matchValue: string
}): EntitySearchResult {
    return { idEntityPersistent, idColumnPersistent: idColumnPersistent, matchValue }
}

export function newEntityDetails({
    entity,
    valueList = []
}: {
    entity: Entity
    valueList?: Value[]
}): EntityDetails {
    return {
        entity,
        valueList: valueList
    }
}

export interface EntityDetailsState {
    showEntityDetails: string | undefined
    entityDetails: RemoteInterface<EntityDetails | undefined>
    entitySearchResults: RemoteInterface<EntitySearchResult[] | undefined>
    entityByIdPersistentMap: { [key: string]: RemoteInterface<Entity | undefined> }
    submitJustification: RemoteInterface<boolean | undefined>
}

export function newEntityDetailsState({
    showEntityDetails = undefined,
    entityDetails = newRemote(undefined),
    entitySearchResults = newRemote(undefined),
    entityByIdPersistentMap = {},
    submitJustification = newRemote(undefined)
}: {
    showEntityDetails?: string | undefined
    entityDetails?: RemoteInterface<EntityDetails | undefined>
    entitySearchResults?: RemoteInterface<EntitySearchResult[] | undefined>
    entityByIdPersistentMap?: { [key: string]: RemoteInterface<Entity | undefined> }
    submitJustification?: RemoteInterface<boolean | undefined>
}): EntityDetailsState {
    return {
        showEntityDetails,
        entityDetails,
        entitySearchResults,
        entityByIdPersistentMap,
        submitJustification
    }
}
