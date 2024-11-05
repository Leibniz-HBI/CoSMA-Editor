import { Rectangle } from '@glideapps/glide-data-grid'
import { TagDefinition, TagType, newTagDefinition } from '../column_menu/state'
import { RemoteInterface, newRemote } from '../util/state'
import { Comment } from '../comments/slice'
import { Entity } from '../entity/state'

export interface TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: { [key: string]: number }
    entities?: Entity[]
    entityIndices: { [key: string]: number }
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedTagDefinitionId?: string
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    isSubmittingValues: boolean
    ownershipChangeTagDefinitionIdPersistent?: string
    showEntityAddDialog: boolean
    entityAddState: RemoteInterface<boolean>
    showEntityMergingModal: boolean
    showEntityJustifications: boolean
    showEntityJustificationHistoryForIdPersistent: RemoteInterface<string | undefined>
    entityJustificationHistory: RemoteInterface<Comment[]>
    showSearch: boolean
}

export function newTableState({
    columnStates: columnStates = [],
    columnIndices: columnIndices = {},
    entities = undefined,
    entityIndices = undefined,
    isLoading = undefined,
    showColumnAddMenu = false,
    selectedTagDefinitionId = undefined,
    selectedColumnHeaderBounds = undefined,
    frozenColumns = 2,
    isSubmittingValues = false,
    ownershipChangeTagDefinitionIdPersistent = undefined,
    showEntityAddDialog = false,
    entityAddState = newRemote(false),
    showEntityMergingModal = false,
    showEntityJustifications = false,
    showEntityJustificationHistoryForIdPersistent = newRemote(undefined),
    entityJustificationHistory = newRemote([]),
    showSearch = false
}: {
    columnStates?: ColumnState[]
    columnIndices?: { [key: string]: number }
    entities?: Entity[]
    entityIndices?: { [key: string]: number }
    isLoading?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rowObjects?: { [key: string]: any }[]
    showColumnAddMenu?: boolean
    selectedTagDefinitionId?: string
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns?: number
    isSubmittingValues?: boolean
    ownershipChangeTagDefinitionIdPersistent?: string
    showEntityAddDialog?: boolean
    entityAddState?: RemoteInterface<boolean>
    showEntityMergingModal?: boolean
    showEntityJustifications?: boolean
    showEntityJustificationHistoryForIdPersistent?: RemoteInterface<string | undefined>
    entityJustificationHistory?: RemoteInterface<Comment[]>
    showSearch?: boolean
}): TableState {
    let newEntityIndices: { [key: string]: number } = {}
    if (entities !== undefined) {
        if (entityIndices === undefined || entityIndices.size != entities.length) {
            entities.forEach((entity, idx) => {
                newEntityIndices[entity.idPersistent] = idx
            })
        } else {
            newEntityIndices = entityIndices
        }
    }
    return {
        columnIndices: columnIndices,
        columnStates: columnStates,
        entities: entities,
        entityIndices: newEntityIndices,
        isLoading: isLoading,
        showColumnAddMenu: showColumnAddMenu,
        selectedTagDefinitionId: selectedTagDefinitionId,
        selectedColumnHeaderBounds: selectedColumnHeaderBounds,
        frozenColumns: frozenColumns,
        isSubmittingValues: isSubmittingValues,
        ownershipChangeTagDefinitionIdPersistent,
        showEntityAddDialog: showEntityAddDialog,
        entityAddState: entityAddState,
        showEntityMergingModal: showEntityMergingModal,
        showEntityJustifications: showEntityJustifications,
        showEntityJustificationHistoryForIdPersistent:
            showEntityJustificationHistoryForIdPersistent,
        entityJustificationHistory: entityJustificationHistory,
        showSearch: showSearch
    }
}

export interface CellValue {
    isExisting?: boolean
    isRequested?: boolean
    value: boolean | string | number | undefined
    idPersistent: string
    version: number
}

export interface ColumnState {
    idTagDefinitionPersistent: string
    cellContents: RemoteInterface<CellValue[][]>
    width: number
}
export function newColumnState({
    idTagDefinitionPersistent = '',
    cellContents = newRemote([]),
    width = 200
}: {
    idTagDefinitionPersistent: string
    cellContents?: RemoteInterface<CellValue[][]>
    width?: number
}): ColumnState {
    return { idTagDefinitionPersistent, cellContents: cellContents, width: width }
}

function columnNameFromState(tagDefinition?: TagDefinition): string {
    if (tagDefinition === undefined) {
        return 'unknown tag'
    }
    return tagDefinition.namePath[tagDefinition.namePath.length - 1]
}
export function csvLinesFromTable({
    entities,
    tagDefinitions,
    columnStates,
    showJustifications
}: {
    entities?: Entity[]
    tagDefinitions: RemoteInterface<TagDefinition | undefined>[]
    columnStates: ColumnState[]
    showJustifications: boolean
}): string[] {
    if (entities === undefined || entities.length == 0) {
        return []
    }
    let columnStartIdx = 1
    if (showJustifications) {
        columnStartIdx += 1
    }
    const lines = []
    const header =
        '"id_entity_persistent","display_txt","justification",' +
        tagDefinitions
            .slice(columnStartIdx)
            .map((colState) => '"' + columnNameFromState(colState.value) + '"')
            .join(',')
    if (header.endsWith(',')) {
        lines.push(header.slice(0, header.length - 1) + '\n')
    } else {
        lines.push(header + '\n')
    }

    for (let rowIdx = 0; rowIdx < entities.length; ++rowIdx) {
        const value =
            '"' +
            entities[rowIdx].idPersistent +
            '","' +
            (entities[rowIdx].displayTxtDetails == 'Display Text'
                ? entities[rowIdx].displayTxt
                : '') +
            '","' +
            (entities[rowIdx].justificationTxt ?? '') +
            '",' +
            columnStates
                .slice(columnStartIdx)
                .map(
                    (colState) =>
                        '"' +
                        (colState.cellContents.value[rowIdx][0]?.value?.toString() ??
                            '') +
                        '"'
                )
                .join(',') +
            '\n'
        lines.push(value)
    }
    return lines
}

export const displayTxtColumnId = 'display_txt_id'
export const displayTxtColumnIdx = 0
export const optionalEntityJustificationColumnIdx = 1

export const displayTextColumn = newTagDefinition({
    namePath: ['Display Text'],
    idPersistent: displayTxtColumnId,
    columnType: 'String' as TagType,
    curated: true,
    version: 0,
    hidden: false
})

export const justificationColumnId = 'justification'
export const justificationColumn = newTagDefinition({
    namePath: ['Justification'],
    idPersistent: justificationColumnId,
    columnType: 'String' as TagType,
    curated: true,
    version: 0,
    hidden: false
})
