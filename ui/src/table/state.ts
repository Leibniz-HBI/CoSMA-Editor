import { Rectangle } from '@glideapps/glide-data-grid'
import { TagDefinition, TagType, newTagDefinition } from '../column_menu/state'
import { RemoteInterface, newRemote } from '../util/state'

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
    columnStates
}: {
    entities?: Entity[]
    columnStates: ColumnState[]
}): string[] {
    if (entities === undefined || entities.length == 0) {
        return []
    }
    const lines = []
    const header =
        '"id_entity_persistent","display_txt",' +
        columnStates
            .slice(1)
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
            '",' +
            columnStates
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
export class TableStateCsvIterator implements Iterator<string | undefined> {
    tableState: TableState
    rowIdx: number

    constructor(tableState: TableState) {
        this.tableState = tableState
        this.rowIdx = -1
    }

    next(): IteratorResult<string | undefined> {
        const entities = this.tableState.entities
        if (entities === undefined || this.rowIdx > entities.length)
            return { done: true, value: undefined }
        if (this.rowIdx < 0) {
            this.rowIdx += 1
            return {
                done: entities.length == 0,
                value:
                    '"id_entity_persistent","display_txt",' +
                    this.tableState.columnStates
                        .map((colState) => '"' + columnNameFromState(colState) + '"')
                        .join(',') +
                    '\n'
            }
        } else {
            const value =
                '"' +
                entities[this.rowIdx] +
                '",' +
                this.tableState.columnStates
                    .map(
                        (colState) =>
                            '"' +
                            (colState.cellContents.value[
                                this.rowIdx
                            ][0].value?.toString() ?? '') +
                            '"'
                    )
                    .join(',') +
                '\n'
            this.rowIdx += 1
            return {
                done: this.rowIdx >= entities.length,
                value
            }
        }
    }
}
export interface Entity {
    idPersistent: string
    displayTxt?: string
    version: number
    disabled: boolean
    displayTxtDetails: string | TagDefinition
}

export function newEntity({
    idPersistent,
    displayTxt,
    displayTxtDetails = 'Display Text',
    version,
    disabled
}: {
    idPersistent: string
    displayTxt?: string
    displayTxtDetails?: string | TagDefinition
    version: number
    disabled: boolean
}) {
    return {
        idPersistent: idPersistent,
        displayTxt: displayTxt,
        displayTxtDetails: displayTxtDetails,
        version: version,
        disabled: disabled
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
