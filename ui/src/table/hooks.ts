import {
    EditableGridCell,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell,
    Rectangle
} from '@glideapps/glide-data-grid'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import { ErrorState } from '../util/error'
import { useThunkReducer } from '../util/state'
import {
    ChangeColumnIndexAction,
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    SetLoadDataErrorAction,
    ShowColumnAddMenuAction,
    ShowHeaderMenuAction,
    SubmitValuesClearErrorAction
} from './actions'
import {
    GetColumnAsyncAction,
    GetTableAsyncAction,
    SubmitValuesAsyncAction
} from './async_actions'
import { tableReducer } from './reducer'
import { CellValue, ColumnState, TableState } from './state'
import { DefaultTagDefinitionsCallbacks } from '../user/hooks'
import { UserInfo } from '../user/state'

export function mkCell(columnType: ColumnType, cellValues: CellValue[]): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    let allowOverlay = true
    let cellContent
    let displayData: string | undefined = undefined
    if (columnType == ColumnType.Inner) {
        // workaround for typescript jest compatibility
        allowOverlay = false
        cellKind = 'boolean' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
        } else {
            cellContent = cellValues[0].value
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
    }
    return {
        kind: cellKind as GridCellKind,
        allowOverlay: allowOverlay,
        displayData: displayData,
        data: cellContent
    } as GridCell
}

export function useCellContentCalback(state: TableState): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const col = state.columnStates[col_idx]
        if (col === undefined) {
            return {
                kind: 'text' as GridCellKind,
                allowOverlay: false,
                displayData: '',
                data: ''
            } as GridCell
        }
        if (col.isLoading) {
            return {
                kind: 'loading' as GridCellKind,
                allowOverlay: true,
                style: 'faded'
            } as LoadingCell
        }
        return mkCell(col.columnType, col.cellContents[row_idx])
    }
}

export type RemoteTableCallbacks = {
    loadTableDataCallback: VoidFunction
    submitValueCallback: (cell: Item, newValue: EditableGridCell) => void
}
export type LocalTableCallbacks = {
    cellContentCallback: (cell: Item) => GridCell
    addColumnCallback: (columnDefinition: ColumnDefinition) => void
    showColumnAddMenuCallback: VoidFunction
    hideColumnAddMenuCallback: VoidFunction
    showHeaderMenuCallback: (columnIdx: number, bounds: Rectangle) => void
    hideHeaderMenuCallback: VoidFunction
    removeColumnCallback: VoidFunction
    setColumnWidthCallback: (
        column: GridColumn,
        newSize: number,
        colIndex: number,
        newSizeWithGrow: number
    ) => void
    switchColumnsCallback: (startIndex: number, endIndex: number) => void
    columnHeaderBoundsCallback: () => {
        left: number
        right: number
        top: number
        bottom: number
        width: number
        height: number
    }
    clearSubmitValueErrorCallback: VoidFunction
    csvLines: () => string[]
}
export type TableDataProps = {
    entities?: string[]
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    frozenColumns: number
    selectedColumnHeaderBounds?: Rectangle
    isShowColumnAddMenu: boolean
    isLoading: boolean
    loadDataErrorState?: ErrorState
    submitValuesErrorState?: ErrorState
}

export function useRemoteTableData(
    userInfoPromise: () => Promise<UserInfo | undefined>,
    defaultColumnCallbacks: DefaultTagDefinitionsCallbacks
): [RemoteTableCallbacks, LocalTableCallbacks, TableDataProps] {
    const [state, dispatch] = useThunkReducer(
        tableReducer,
        new TableState({ frozenColumns: 1 })
    )
    const isLoading = state.isLoading || state.isLoadingColumn()
    return [
        {
            loadTableDataCallback: () => {
                if (state.entities !== undefined || isLoading) {
                    return
                }
                userInfoPromise().then((userInfo) => {
                    if (userInfo === undefined) {
                        dispatch(
                            new SetLoadDataErrorAction(
                                'Please refresh the page and log in'
                            )
                        )
                    }
                    dispatch(new GetTableAsyncAction()).then(async () => {
                        userInfo?.columns.forEach(async (col: ColumnDefinition) => {
                            const idPersistent = col.idPersistent
                            if (
                                state.isLoading ||
                                (state.columnIndices.has(idPersistent) &&
                                    state.columnStates[
                                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                        state.columnIndices.get(idPersistent)!
                                    ].isLoading)
                            ) {
                                return
                            }
                            await dispatch(new GetColumnAsyncAction(col))
                        })
                    })
                })
            },
            submitValueCallback: (cell, newValue) => {
                if (state.entities === undefined || state.isSubmittingValues) {
                    return
                }
                const [colIdx, rowIdx] = cell
                dispatch(
                    new SubmitValuesAsyncAction(state.columnStates[colIdx].columnType, [
                        state.entities[rowIdx],
                        state.columnStates[colIdx].idPersistent,
                        {
                            ...state.columnStates[colIdx].cellContents[rowIdx][0],
                            value: newValue.data?.toString()
                        }
                    ])
                )
            }
        },
        {
            cellContentCallback: useCellContentCalback(state),
            addColumnCallback: (columnDefinition: ColumnDefinition) =>
                dispatch(new GetColumnAsyncAction(columnDefinition)).then(() =>
                    defaultColumnCallbacks.appendToDefaultTagDefinitionsCallback(
                        columnDefinition.idPersistent
                    )
                ),
            showColumnAddMenuCallback: () => dispatch(new ShowColumnAddMenuAction()),
            hideColumnAddMenuCallback: () => dispatch(new HideColumnAddMenuAction()),
            showHeaderMenuCallback: (columnIdx: number, bounds: Rectangle) => {
                dispatch(new ShowHeaderMenuAction(columnIdx, bounds))
            },
            hideHeaderMenuCallback: () => dispatch(new HideHeaderMenuAction()),
            removeColumnCallback: () => {
                dispatch(new RemoveSelectedColumnAction())
                if (state.selectedColumnHeaderByIdPersistent) {
                    defaultColumnCallbacks.removeFromDefaultTagDefinitionListCallback(
                        state.selectedColumnHeaderByIdPersistent
                    )
                }
            },
            setColumnWidthCallback: (
                column: GridColumn,
                newSize: number,
                colIndex: number,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                newSizeWithGrow: number
            ) => dispatch(new SetColumnWidthAction(colIndex, newSize)),
            switchColumnsCallback: (startIndex: number, endIndex: number) => {
                dispatch(new ChangeColumnIndexAction(startIndex, endIndex))
                defaultColumnCallbacks.changeDefaultTagDefinitionsCallback(
                    startIndex,
                    endIndex
                )
            },
            columnHeaderBoundsCallback: () => ({
                left: state.selectedColumnHeaderBounds?.x ?? 0,
                top: state.selectedColumnHeaderBounds?.y ?? 0,
                width: state.selectedColumnHeaderBounds?.width ?? 0,
                height: state.selectedColumnHeaderBounds?.height ?? 0,
                right:
                    (state.selectedColumnHeaderBounds?.x ?? 0) +
                    (state.selectedColumnHeaderBounds?.width ?? 0),
                bottom:
                    (state.selectedColumnHeaderBounds?.y ?? 0) +
                    (state.selectedColumnHeaderBounds?.height ?? 0)
            }),
            clearSubmitValueErrorCallback: () =>
                dispatch(new SubmitValuesClearErrorAction()),
            csvLines: () => {
                console.log(state)
                return state.csvLines()
            }
        },
        {
            entities: state.entities,
            columnStates: state.columnStates,
            columnIndices: state.columnIndices,
            frozenColumns: state.frozenColumns,
            isShowColumnAddMenu: state.showColumnAddMenu,
            selectedColumnHeaderBounds: state.selectedColumnHeaderBounds,
            loadDataErrorState: state.loadDataErrorState,
            submitValuesErrorState: state.submitValuesErrorState,
            isLoading: isLoading
        }
    ]
}
