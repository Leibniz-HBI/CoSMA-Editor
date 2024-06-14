import { Rectangle } from '@glideapps/glide-data-grid'
import { TagDefinition, TagType, newTagDefinition } from '../column_menu/state'
import { RemoteInterface, newRemote } from '../util/state'
import { Comment } from '../comments/slice'

export interface TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: { [key: string]: number }
    entities?: Entity[]
    entityIndices: { [key: string]: number }
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedTagDefinition?: TagDefinition
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    isSubmittingValues: boolean
    ownershipChangeTagDefinition?: TagDefinition
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
    selectedTagDefinition = undefined,
    selectedColumnHeaderBounds = undefined,
    frozenColumns = 0,
    isSubmittingValues = false,
    ownershipChangeTagDefinition = undefined,
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
    selectedTagDefinition?: TagDefinition
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns?: number
    isSubmittingValues?: boolean
    ownershipChangeTagDefinition?: TagDefinition
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
        selectedTagDefinition: selectedTagDefinition,
        selectedColumnHeaderBounds: selectedColumnHeaderBounds,
        frozenColumns: frozenColumns,
        isSubmittingValues: isSubmittingValues,
        ownershipChangeTagDefinition: ownershipChangeTagDefinition,
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
    tagDefinition: TagDefinition
    cellContents: RemoteInterface<CellValue[][]>
    width: number
}
export function newColumnState({
    tagDefinition = {
        idPersistent: '',
        namePath: [],
        columnType: TagType.String,
        curated: false,
        version: 0,
        hidden: false,
        disabled: false
    },
    cellContents = newRemote([]),
    width = 200
}: {
    tagDefinition: TagDefinition
    cellContents?: RemoteInterface<CellValue[][]>
    width?: number
}): ColumnState {
    return { tagDefinition: tagDefinition, cellContents: cellContents, width: width }
}

function columnNameFromState(colState: ColumnState): string {
    return colState.tagDefinition.namePath[colState.tagDefinition.namePath.length - 1]
}
export function csvLinesFromTable({
    entities,
    columnStates,
    showJustifications
}: {
    entities?: Entity[]
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
        columnStates
            .slice(columnStartIdx)
            .map((colState) => '"' + columnNameFromState(colState) + '"')
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

export interface Entity {
    idPersistent: string
    displayTxt?: string
    version: number
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
export const displayTxtColumnId = 'display_txt_id'
export const displayTextColumn = newTagDefinition({
    namePath: ['Display Text'],
    idPersistent: displayTxtColumnId,
    columnType: TagType.String,
    curated: true,
    version: 0,
    hidden: false
})

export const justificationColumnId = 'justification'
export const justificationColumn = newTagDefinition({
    namePath: ['Justification'],
    idPersistent: justificationColumnId,
    columnType: TagType.String,
    curated: true,
    version: 0,
    hidden: false
})
