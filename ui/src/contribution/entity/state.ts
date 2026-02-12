import { Column } from '../../column_menu/state'
import { Entity } from '../../entity/state'
import { CellValue } from '../../table/state'
import { RemoteInterface, newRemote } from '../../util/state'

export interface ScoredEntity {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails: string | Column
    version: number
    similarity: number
    cellContents: RemoteInterface<CellValue[]>[]
    idMatchColumnPersistentList: string[]
}

export interface DiscardableScoredEntity {
    assignedDuplicate: ScoredEntity | undefined
    discard: boolean
}

export function newScoredEntity({
    idPersistent,
    displayTxt,
    displayTxtDetails,
    version,
    similarity,
    cellContents = [],
    idMatchColumnPersistentList = []
}: {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails: string | Column
    version: number
    similarity: number
    cellContents?: RemoteInterface<CellValue[]>[]
    idMatchColumnPersistentList?: string[]
}): ScoredEntity {
    return {
        idPersistent: idPersistent,
        displayTxt: displayTxt,
        displayTxtDetails: displayTxtDetails,
        version,
        similarity: similarity,
        cellContents: cellContents,
        idMatchColumnPersistentList
    }
}

export function newDiscardableScoredEntity({
    assignedDuplicate = undefined,
    discard = false
}: {
    assignedDuplicate?: ScoredEntity
    discard?: boolean
}): DiscardableScoredEntity {
    return {
        assignedDuplicate,
        discard
    }
}

export interface EntityWithDuplicates extends Entity {
    similarEntities: RemoteInterface<ScoredEntity[]>
    assignedDuplicate: RemoteInterface<DiscardableScoredEntity | undefined>
    cellContents: RemoteInterface<CellValue[]>[]
    entityMap: { [key: string]: number }
    justificationTxt: string | undefined
}
export function newEntityWithDuplicates({
    idPersistent,
    displayTxt,
    displayTxtDetails = undefined,
    version,
    disabled = false,
    similarEntities,
    assignedDuplicate = newRemote({ assignedDuplicate: undefined, discard: false }),
    cellContents = [],
    entityMap = undefined,
    justificationTxt = undefined
}: {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails?: string | Column
    version: number
    disabled?: boolean
    similarEntities: RemoteInterface<ScoredEntity[]>
    assignedDuplicate?: RemoteInterface<undefined | DiscardableScoredEntity>
    cellContents?: RemoteInterface<CellValue[]>[]
    entityMap?: { [key: string]: number }
    justificationTxt?: string | undefined
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
        disabled,
        similarEntities: similarEntities,
        assignedDuplicate: assignedDuplicate,
        cellContents: cellContents,
        entityMap: newEntityMap,
        justificationTxt
    }
}

export interface Value {
    idEntityPersistent: string
    idColumnPersistent: string
    cellValue: CellValue
}
export function newValue(
    idEntityPersistent: string,
    idColumnPersistent: string,
    cellValue: CellValue
): Value {
    return {
        idEntityPersistent,
        idColumnPersistent,
        cellValue: cellValue
    }
}

export interface ContributionEntityState {
    entities: RemoteInterface<EntityWithDuplicates[] | undefined>
    entityMap: { [key: string]: number }
    completeEntityAssignment: RemoteInterface<boolean>
    columnList: Column[]
    columnMap: { [key: string]: number }
    showColumnMenu: boolean
    selectedEntityIdx?: number
    hitLastMatch: boolean | undefined
    matchWidths: number[]
    showJustificationDialog: boolean
}
export function newContributionEntityState({
    entities = newRemote(undefined),
    entityMap,
    completeEntityAssignment = newRemote(false),
    columnList = [],
    columnMap,
    showColumnMenu = false,
    selectedEntityIdx = undefined,
    hitLastMatch = undefined,
    matchWidths = [200, 200],
    showJustificationDialog = false
}: {
    entities?: RemoteInterface<EntityWithDuplicates[] | undefined>
    entityMap?: { [key: string]: number }
    completeEntityAssignment?: RemoteInterface<boolean>
    columnList?: Column[]
    columnMap?: { [key: string]: number }
    showColumnMenu?: boolean
    selectedEntityIdx?: number
    hitLastMatch?: boolean| undefined
    matchWidths?: number[]
    showJustificationDialog?: boolean
}): ContributionEntityState {
    let newEntityMap: { [key: string]: number }, newColumnMap: { [key: string]: number }
    if (entities.value === undefined) {
        newEntityMap = {}
    } else if (entityMap === undefined || entityMap.size != entities.value.length) {
        newEntityMap = {}
        for (let idx = 0; idx < entities.value.length; ++idx) {
            newEntityMap[entities.value[idx].idPersistent] = idx
        }
    } else {
        newEntityMap = entityMap
    }
    if (columnMap === undefined || columnMap.size != columnList.length) {
        newColumnMap = {}
        for (let idx = 0; idx < columnList.length; ++idx) {
            newColumnMap[columnList[idx].idPersistent] = idx
        }
    } else {
        newColumnMap = columnMap
    }
    return {
        entities: entities,
        completeEntityAssignment: completeEntityAssignment,
        columnList: columnList,
        showColumnMenu: showColumnMenu,
        entityMap: newEntityMap,
        columnMap: newColumnMap,
        selectedEntityIdx: selectedEntityIdx,
        hitLastMatch: hitLastMatch,
        matchWidths: matchWidths,
        showJustificationDialog: showJustificationDialog
    }
}
