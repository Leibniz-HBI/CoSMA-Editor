import {
    CustomCell,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell,
    Theme
} from '@glideapps/glide-data-grid'
import { TagDefinition, TagType } from '../../column_menu/state'
import { EntityWithDuplicates } from './state'
import { CellValue } from '../../table/state'
import { AssignType } from '../../table/draw'
import { RemoteInterface } from '../../util/state'

export type GridColumWithType = GridColumn & { columnType: TagType }

export function constructColumnTitle(namePath: string[]): string {
    if (namePath === undefined || namePath.length == 0) {
        return 'UNKNOWN'
    }
    if (namePath.length == 1) {
        return namePath[0]
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
            displayData = cellContent?.toString()
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
    tagTypes: GridColumWithType[],
    numMatchTags: number,
    tagDefinitions: TagDefinition[]
): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        let contentAlign = 'right'
        let displayTxt: string | undefined = ''
        let themeOverride = {}
        let style = 'normal'
        if (row_idx < 4) {
            // special case, not tag value
            if (row_idx == 0) {
                // row with assignment buttons
                let replaceInfo = undefined
                if (col_idx == 0) {
                    return {
                        kind: 'text' as GridCellKind,
                        data: '',
                        displayData: ''
                    } as GridCell
                } else if (col_idx == 1) {
                    replaceInfo = new AssignType(
                        false,
                        entityGroup.assignedDuplicate.value?.idPersistent == undefined
                    )
                } else {
                    replaceInfo = new AssignType(
                        true,
                        entityGroup.similarEntities.value[col_idx - 2].idPersistent ==
                            entityGroup.assignedDuplicate.value?.idPersistent
                    )
                }
                return {
                    kind: 'custom' as GridCellKind,
                    data: replaceInfo
                } as CustomCell<AssignType>
            } else if (row_idx == 1) {
                // row with similarities
                if (col_idx > 1) {
                    displayTxt =
                        Math.round(
                            entityGroup.similarEntities.value[col_idx - 2]?.similarity *
                                100
                        ) + ' %'
                } else if (col_idx == 1) {
                    displayTxt = ''
                    contentAlign = 'center'
                    style = 'faded'
                } else {
                    displayTxt = 'Display Text Similarity'
                    contentAlign = 'left'
                }
            } else if (row_idx == 2) {
                if (col_idx > 1) {
                    displayTxt = `${
                        entityGroup.similarEntities.value[col_idx - 2]
                            .idMatchTagDefinitionPersistentList.length
                    }/${numMatchTags}`
                } else if (col_idx == 0) {
                    displayTxt = 'Match Count'
                    contentAlign = 'left'
                } else {
                    displayTxt = ''
                    contentAlign = 'center'
                    style = 'faded'
                }
            } else {
                // display_txt
                if (col_idx > 1) {
                    displayTxt =
                        entityGroup.similarEntities.value[col_idx - 2].displayTxt
                } else if (col_idx == 1) {
                    displayTxt = entityGroup.displayTxt
                } else {
                    contentAlign = 'left'
                    displayTxt = 'Display Text'
                }
            }
            return {
                kind: 'text' as GridCellKind,
                allowOverlay: false,
                displayData: displayTxt,
                data: displayTxt,
                contentAlign,
                themeOverride,
                style
            } as GridCell
        }
        // case tag value
        let cellContents: RemoteInterface<CellValue[]> | undefined = undefined
        if (col_idx == 0) {
            return {
                kind: 'text' as GridCellKind,
                allowOverlay: false,
                displayData: tagTypes[row_idx - 4].title,
                data: row_idx.toString(),
                contentAlign: 'left'
            } as GridCell
        } else if (col_idx == 1) {
            cellContents = entityGroup.cellContents[row_idx - 4]
        } else {
            if (
                entityGroup.similarEntities.value[
                    col_idx - 2
                ].idMatchTagDefinitionPersistentList.includes(
                    tagDefinitions[row_idx - 4]?.idPersistent ?? ''
                )
            ) {
                themeOverride = { bgCell: '#d1e3e3', baseFontStyle: '600 13px' }
            }
            if (entityGroup.similarEntities.isLoading) {
                return loadingCell
            }
            cellContents =
                entityGroup.similarEntities.value[col_idx - 2].cellContents[row_idx - 4]
        }
        if (cellContents === undefined) {
            return emptyCell
        }
        if (cellContents.isLoading) {
            return loadingCell
        }
        return mkComparisonCell(
            tagTypes[row_idx - 4].columnType,
            cellContents?.value ?? [],
            themeOverride
        )
    }
}
