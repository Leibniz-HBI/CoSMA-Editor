import { TagDefinition } from '../../column_menu/state'
import { Entity } from '../../table/state'
import { CellValue } from '../../table/state'
import { RemoteInterface, newRemote } from '../../util/state'

export interface ScoredEntity {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails: string | TagDefinition
    version: number
    similarity: number
    cellContents: RemoteInterface<CellValue[]>[]
    idMatchTagDefinitionPersistentList: string[]
}
export function newScoredEntity({
    idPersistent,
    displayTxt,
    displayTxtDetails,
    version,
    similarity,
    cellContents = [newRemote([])],
    idMatchTagDefinitionPersistentList = []
}: {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails: string | TagDefinition
    version: number
    similarity: number
    cellContents?: RemoteInterface<CellValue[]>[]
    idMatchTagDefinitionPersistentList?: string[]
}): ScoredEntity {
    return {
        idPersistent: idPersistent,
        displayTxt: displayTxt,
        displayTxtDetails: displayTxtDetails,
        version,
        similarity: similarity,
        cellContents: cellContents,
        idMatchTagDefinitionPersistentList: idMatchTagDefinitionPersistentList
    }
}

export interface EntityWithDuplicates {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails: TagDefinition | string
    version: number
    similarEntities: RemoteInterface<ScoredEntity[]>
    assignedDuplicate: RemoteInterface<Entity | undefined>
    cellContents: RemoteInterface<CellValue[]>[]
    entityMap: { [key: string]: number }
}
export function newEntityWithDuplicates({
    idPersistent,
    displayTxt,
    displayTxtDetails = undefined,
    version,
    similarEntities,
    assignedDuplicate = newRemote(undefined),
    cellContents = [newRemote([])],
    entityMap = undefined
}: {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails?: string | TagDefinition
    version: number
    similarEntities: RemoteInterface<ScoredEntity[]>
    assignedDuplicate?: RemoteInterface<undefined | Entity>
    cellContents?: RemoteInterface<CellValue[]>[]
    entityMap?: { [key: string]: number }
}): EntityWithDuplicates {
    let newEntityMap: { [key: string]: number }
    if (entityMap === undefined || entityMap.size != similarEntities.value.length) {
        newEntityMap = {}
        for (let idx = 0; idx < similarEntities.value.length; ++idx) {
            newEntityMap[similarEntities.value[idx].idPersistent] = idx
        }
    } else {
        newEntityMap = entityMap
    }
    return {
        idPersistent: idPersistent,
        displayTxt: displayTxt,
        displayTxtDetails: displayTxtDetails ?? idPersistent,
        version,
        similarEntities: similarEntities,
        assignedDuplicate: assignedDuplicate,
        cellContents: cellContents,
        entityMap: newEntityMap
    }
}

export interface TagInstance {
    idEntityPersistent: string
    idTagDefinitionPersistent: string
    cellValue: CellValue
}
export function newTagInstance(
    idEntityPersistent: string,
    idTagDefinitionPersistent: string,
    cellValue: CellValue
): TagInstance {
    return {
        idEntityPersistent: idEntityPersistent,
        idTagDefinitionPersistent: idTagDefinitionPersistent,
        cellValue: cellValue
    }
}

export interface ContributionEntityState {
    entities: RemoteInterface<EntityWithDuplicates[]>
    entityMap: { [key: string]: number }
    completeEntityAssignment: RemoteInterface<boolean>
    tagDefinitions: TagDefinition[]
    tagDefinitionMap: { [key: string]: number }
    showTagDefinitionMenu: boolean
    selectedEntityIdx?: number
}
export function newContributionEntityState({
    entities = newRemote([]),
    entityMap,
    completeEntityAssignment = newRemote(false),
    tagDefinitions = [],
    tagDefinitionMap: columnDefinitionMap,
    showTagDefinitionMenu = false,
    selectedEntityIdx = undefined
}: {
    entities?: RemoteInterface<EntityWithDuplicates[]>
    entityMap?: { [key: string]: number }
    completeEntityAssignment?: RemoteInterface<boolean>
    tagDefinitions?: TagDefinition[]
    tagDefinitionMap?: { [key: string]: number }
    showTagDefinitionMenu?: boolean
    selectedEntityIdx?: number
}): ContributionEntityState {
    let newEntityMap: { [key: string]: number },
        newTagDefinitionMap: { [key: string]: number }
    if (entityMap === undefined || entityMap.size != entities.value.length) {
        newEntityMap = {}
        for (let idx = 0; idx < entities.value.length; ++idx) {
            newEntityMap[entities.value[idx].idPersistent] = idx
        }
    } else {
        newEntityMap = entityMap
    }
    if (
        columnDefinitionMap === undefined ||
        columnDefinitionMap.size != tagDefinitions.length
    ) {
        newTagDefinitionMap = {}
        for (let idx = 0; idx < tagDefinitions.length; ++idx) {
            newTagDefinitionMap[tagDefinitions[idx].idPersistent] = idx
        }
    } else {
        newTagDefinitionMap = columnDefinitionMap
    }
    return {
        entities: entities,
        completeEntityAssignment: completeEntityAssignment,
        tagDefinitions: tagDefinitions,
        showTagDefinitionMenu: showTagDefinitionMenu,
        entityMap: newEntityMap,
        tagDefinitionMap: newTagDefinitionMap,
        selectedEntityIdx: selectedEntityIdx
    }
}
