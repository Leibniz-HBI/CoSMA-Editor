import { GridCell, GridCellKind, Item, Theme } from '@glideapps/glide-data-grid'
import { Column, ColumnType } from '../column_menu/state'
import {
    CellValue,
    ColumnState,
    displayTxtColumnIdx,
    optionalEntityJustificationColumnIdx
} from './state'
import { Entity } from '../entity/state'
import { LoadingCell } from './draw'
import { RemoteInterface } from '../util/state'

const emptyCell = {
    kind: 'text' as GridCellKind,
    allowOverlay: false,
    displayData: '',
    data: ''
} as GridCell

export function mkCell(
    columnType: ColumnType,
    cellValues: CellValue[] | undefined,
    themeOverride: Partial<Theme> = {}
): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    let allowOverlay = true
    let cellContent
    let displayData: string | undefined = undefined
    if (cellValues === undefined) {
        return {
            kind: cellKind as GridCellKind,
            allowOverlay: allowOverlay,
            displayData: '',
            data: ''
        } as GridCell
    }
    if (columnType == ColumnType.Boolean) {
        // workaround for typescript jest compatibility
        allowOverlay = false
        cellKind = 'boolean' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
        } else {
            cellContent = cellValues[0].value?.toString().toLowerCase() == 'true'
        }
    } else if (columnType == ColumnType.Float) {
        // workaround for typescript jest compatibility
        cellKind = 'number' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
            displayData = ''
        } else {
            cellContent = cellValues[0].value
            displayData = cellContent?.toString()
        }
    } else if (columnType == ColumnType.String) {
        if (cellValues.length == 0) {
            cellContent = ''
            displayData = ''
        } else {
            if (cellValues.length < 2) {
                cellContent = cellValues[0].value
                displayData = cellContent?.toString() ?? ''
                if (cellContent === undefined || cellContent === null) {
                    cellContent = ''
                }
            } else {
                // workaround for typescript jest compatibility
                cellKind = 'bubble' as GridCellKind
                cellContent = cellValues.map((value) => value.value)
                displayData = ''
            }
        }
    } else if (columnType == ColumnType.Inner) {
        allowOverlay = false
        displayData = ''
        cellContent = ''
    }
    return {
        kind: cellKind as GridCellKind,
        allowOverlay: allowOverlay,
        displayData: displayData,
        data: cellContent,
        themeOverride
    } as GridCell
}

export function createCellContentCallback({
    entities,
    columnStates,
    columns,
    showEntityJustifications
}: {
    entities?: Entity[]
    columnStates: ColumnState[]
    columns: RemoteInterface<Column | undefined>[]
    showEntityJustifications: boolean
}): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const entity = entities?.at(row_idx)
        if (entities === undefined || entity === undefined) {
            return emptyCell
        }
        if (col_idx == displayTxtColumnIdx) {
            return mkCell(ColumnType.String, [
                {
                    idPersistent: entity.idPersistent,
                    value: entity.displayTxt,
                    version: entity.version
                }
            ])
        }
        if (
            showEntityJustifications &&
            col_idx == optionalEntityJustificationColumnIdx
        ) {
            return mkCell(ColumnType.String, [
                {
                    idPersistent: entity.idPersistent,
                    value: entity.justificationTxt,
                    version: entity.version
                }
            ])
        }
        const col = columnStates[col_idx]
        const column = columns[col_idx]
        const themeOverride: Partial<Theme> = {}
        if(column.value?.disabled){
            themeOverride.bgCell = '#899696ff'
        }
        if (col === undefined || column === undefined || column.value === undefined) {
            return emptyCell
        }
        if (col.cellContents.isLoading || column.isLoading) {
            return {
                kind: 'custom' as GridCellKind,
                allowOverlay: true,
                data: { kind: 'custom-loading-cell', rowIdx: row_idx, colIdx: col_idx }
            } as LoadingCell
        }
        return mkCell(column.value.columnType, col.cellContents.value[row_idx], themeOverride)
    }
}
