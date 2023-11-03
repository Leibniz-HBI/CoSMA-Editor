import {
    CustomCell,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell,
    Theme
} from '@glideapps/glide-data-grid'
import { TagType } from '../../column_menu/state'
import { EntityWithDuplicates } from './state'
import { CellValue } from '../../table/state'
import { AssignType } from '../../table/draw'

export type GridColumWithType = GridColumn & { columnType: TagType }

export function constructColumnTitle(namePath: string[]): string {
    if (namePath === undefined || namePath.length == 0) {
        return 'UNKNOWN'
    }
    if (namePath.length > 3) {
        return (
            namePath[0] +
            ' -> ... -> ' +
            namePath[namePath.length - 2] +
            ' -> ' +
            namePath[namePath.length - 1]
        )
    }
    return namePath[0] + ' -> ' + namePath.slice(1).join(' -> ')
}

const emptyCell = {
    kind: 'text' as GridCellKind,
    allowOverlay: false,
    displayData: '',
    data: ''
} as GridCell
const loadingCell = {
    kind: 'loading' as GridCellKind,
    allowOverlay: true,
    style: 'faded'
} as LoadingCell

export function mkComparisonCell(
    columnType: TagType,
    cellValues: CellValue[],
    themeOverride?: Partial<Theme>
): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    let cellContent
    let displayData: string | undefined = undefined
    if (columnType == TagType.Inner) {
        // workaround for typescript jest compatibility
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
        allowOverlay: false,
        displayData: displayData,
        data: cellContent,
        contentAlign: 'right',
        themeOverride
    } as GridCell
}
export function mkCellContentCallback(
    entityGroup: EntityWithDuplicates,
    columnTypes: GridColumWithType[]
): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        let themeOverride = undefined
        let contentAlign = 'right'
        if (row_idx == 0) {
            themeOverride = { baseFontStyle: 'bold 13px' }
        }
        if (col_idx < 3) {
            if (col_idx == 0) {
                let replaceInfo = undefined
                if (row_idx == 0) {
                    replaceInfo = new AssignType(
                        false,
                        entityGroup.assignedDuplicate.value?.idPersistent == undefined
                    )
                } else {
                    replaceInfo = new AssignType(
                        true,
                        entityGroup.similarEntities.value[row_idx - 1].idPersistent ==
                            entityGroup.assignedDuplicate.value?.idPersistent
                    )
                }
                return {
                    kind: 'custom' as GridCellKind,
                    data: replaceInfo
                } as CustomCell<AssignType>
            }
            let displayTxt = entityGroup.displayTxt
            if (col_idx == 2) {
                if (row_idx == 0) {
                    displayTxt = ''
                } else {
                    displayTxt =
                        Math.round(
                            entityGroup.similarEntities.value[row_idx - 1].similarity *
                                100
                        ) + ' %'
                }
            } else {
                contentAlign = 'left'
                if (row_idx != 0) {
                    displayTxt =
                        entityGroup.similarEntities.value[row_idx - 1].displayTxt
                }
            }

            return {
                kind: 'text' as GridCellKind,
                allowOverlay: false,
                displayData: displayTxt,
                data: displayTxt,
                themeOverride,
                contentAlign
            } as GridCell
        }
        let cellContents
        if (row_idx == 0) {
            cellContents = entityGroup.cellContents[col_idx - 3]
        } else if (entityGroup.similarEntities.isLoading) {
            return loadingCell
        } else {
            cellContents =
                entityGroup.similarEntities.value[row_idx - 1].cellContents[col_idx - 3]
        }
        if (cellContents === undefined) {
            return emptyCell
        }
        if (cellContents.isLoading) {
            return loadingCell
        }
        return mkComparisonCell(
            columnTypes[col_idx].columnType,
            cellContents.value,
            themeOverride
        )
    }
}
