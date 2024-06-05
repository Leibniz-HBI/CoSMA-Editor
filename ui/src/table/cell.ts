import { CustomCell, GridCell, GridCellKind, Item } from '@glideapps/glide-data-grid'
import { TagType } from '../column_menu/state'
import { CellValue, ColumnState, Entity } from './state'
import { LoadingType } from './draw'

const emptyCell = {
    kind: 'text' as GridCellKind,
    allowOverlay: false,
    displayData: '',
    data: ''
} as GridCell

export function mkCell(columnType: TagType, cellValues?: CellValue[]): GridCell {
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
    if (columnType == TagType.Inner) {
        // workaround for typescript jest compatibility
        allowOverlay = false
        cellKind = 'boolean' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
        } else {
            cellContent = cellValues[0].value
        }
    } else if (columnType == TagType.Float) {
        // workaround for typescript jest compatibility
        cellKind = 'number' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
            displayData = ''
        } else {
            cellContent = cellValues[0].value
            displayData = cellContent?.toString()
        }
    } else if (columnType == TagType.String) {
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
    }
    return {
        kind: cellKind as GridCellKind,
        allowOverlay: allowOverlay,
        displayData: displayData,
        data: cellContent
    } as GridCell
}

const loadingInstance = new LoadingType()

export function createCellContentCallback({
    columnStates
}: {
    columnStates: ColumnState[]
}): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const col = columnStates[col_idx]
        if (col === undefined) {
            return emptyCell
        }
        if (col.cellContents.isLoading) {
            return {
                kind: 'custom' as GridCellKind,
                allowOverlay: true,
                style: 'faded',
                data: loadingInstance
            } as CustomCell<LoadingType>
        }
        return mkCell(col.tagDefinition.columnType, col.cellContents.value[row_idx])
    }
}
