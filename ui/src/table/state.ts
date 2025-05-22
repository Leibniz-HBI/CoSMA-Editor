import { Rectangle } from '@glideapps/glide-data-grid'
import { Column, ColumnType } from '../column_menu/state'
import { RemoteInterface, newRemote } from '../util/state'
import { Comment } from '../comments/slice'
import { Entity } from '../entity/state'

export interface TableState {
    columnStates: ColumnState[]
    columnIndices: { [key: string]: number }
    entities?: Entity[]
    entityIndices: { [key: string]: number }
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedColumnId?: string
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    isSubmittingValues: boolean
    ownershipChangeColumnIdPersistent?: string
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
    selectedColumnId = undefined,
    selectedColumnHeaderBounds = undefined,
    frozenColumns = 2,
    isSubmittingValues = false,
    ownershipChangeColumnIdPersistent = undefined,
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
    selectedColumnId?: string
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns?: number
    isSubmittingValues?: boolean
    ownershipChangeColumnIdPersistent?: string
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
        selectedColumnId: selectedColumnId,
        selectedColumnHeaderBounds: selectedColumnHeaderBounds,
        frozenColumns: frozenColumns,
        isSubmittingValues: isSubmittingValues,
        ownershipChangeColumnIdPersistent: ownershipChangeColumnIdPersistent,
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
    idColumnPersistent: string
    cellContents: RemoteInterface<CellValue[][]>
    width: number
}
export function newColumnState({
    idColumnPersistent = '',
    cellContents = newRemote([]),
    width = 200
}: {
    idColumnPersistent: string
    cellContents?: RemoteInterface<CellValue[][]>
    width?: number
}): ColumnState {
    return {
        idColumnPersistent: idColumnPersistent,
        cellContents: cellContents,
        width: width
    }
}

function columnNameFromState(column?: Column): string {
    if (column === undefined) {
        return 'unknown column'
    }
    return column.namePath[column.namePath.length - 1]
}
export function csvLinesFromTable({
    entities,
    selectedRows,
    columns,
    columnStates,
    showJustifications
}: {
    entities?: Entity[]
    selectedRows: number[]
    columns: RemoteInterface<Column | undefined>[]
    columnStates: ColumnState[]
    showJustifications: boolean
}): string[] {
    if (entities === undefined || entities.length == 0) {
        return []
    }
    let entityExportList = entities
    if (selectedRows.length > 0) {
        entityExportList = []
        for (const idx of selectedRows) {
            entityExportList.push(entities[idx])
        }
    }
    let columnStartIdx = 1
    if (showJustifications) {
        columnStartIdx += 1
    }
    const lines = []
    const header =
        '"id_entity_persistent","display_txt","justification",' +
        columns
            .slice(columnStartIdx)
            .map((colState) => '"' + columnNameFromState(colState.value) + '"')
            .join(',')
    if (header.endsWith(',')) {
        lines.push(header.slice(0, header.length - 1) + '\n')
    } else {
        lines.push(header + '\n')
    }

    for (let rowIdx = 0; rowIdx < entityExportList.length; ++rowIdx) {
        const value =
            '"' +
            entityExportList[rowIdx].idPersistent +
            '","' +
            (entityExportList[rowIdx].displayTxtDetails == 'Display Text'
                ? entityExportList[rowIdx].displayTxt
                : '') +
            '","' +
            (entityExportList[rowIdx].justificationTxt ?? '') +
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

export const justificationColumnId = 'justification'
export const displayTxtColumnId = 'display_txt_id'
export const displayTxtColumnIdx = 0
export const optionalEntityJustificationColumnIdx = 1

export const displayTextColumn: Column = {
    namePath: ['Display Text'],
    idPersistent: displayTxtColumnId,
    columnType: 'String' as ColumnType,
    curated: true,
    version: 0,
    disabled: false,
    hidden: false
}
export const justificationColumn: Column = {
    namePath: ['Justification'],
    idPersistent: justificationColumnId,
    columnType: 'String' as ColumnType,
    curated: true,
    version: 0,
    disabled: false,
    hidden: false
}
