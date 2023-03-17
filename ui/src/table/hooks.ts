import {
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell,
    Rectangle
} from '@glideapps/glide-data-grid'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import { useThunkReducer } from '../util/state'
import {
    ChangeColumnIndexAction,
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ShowColumnAddMenuAction,
    ShowHeaderMenuAction
} from './actions'
import { GetColumnAsyncAction, GetTableAsyncAction } from './async_actions'
import { tableReducer } from './reducer'
import { ColumnState, TableState } from './state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mkCell(cellContent: any, columnType: ColumnType): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    const cellValues = cellContent?.values
    if (columnType == ColumnType.Inner) {
        // workaround for typescript jest compatibility
        cellKind = 'boolean' as GridCellKind
        if (cellValues === undefined || cellValues === null) {
            cellContent = false
        } else {
            cellContent = cellValues[0].toLowerCase() == 'true'
        }
    }
    if (columnType == ColumnType.String) {
        if (cellValues === undefined || cellValues === null) {
            cellContent = ''
        } else {
            if (cellValues.length < 2) {
                cellContent = cellValues[0]
                if (cellContent === undefined || cellContent === null) {
                    cellContent = ''
                }
            } else {
                // workaround for typescript jest compatibility
                cellKind = 'bubble' as GridCellKind
                cellContent = cellValues
            }
        }
    }
    return {
        kind: cellKind as GridCellKind,
        allowOverlay: false,
        displayData: cellContent,
        data: cellContent
    } as GridCell
}

export function useCellContentCalback(state: TableState) {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const entity_id_persistent = state.entities[row_idx]
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
        return mkCell(col.cellContents[entity_id_persistent], col.columnType)
    }
}

export type RemoteTableCallbacks = { loadTableDataCallback: VoidFunction }
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
}
export type TableDataProps = {
    entities: string[]
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    frozenColumns: number
    selectedColumnHeaderBounds?: Rectangle
    isShowColumnAddMenu: boolean
    isLoading: boolean
    errorMsg?: string
    baseUrl: string
}

export function useRemoteTableData(
    apiPath: string,
    columnDefinitionList: ColumnDefinition[]
): [RemoteTableCallbacks, LocalTableCallbacks, TableDataProps] {
    const [state, dispatch] = useThunkReducer(
        tableReducer,
        new TableState({ frozenColumns: 1 })
    )
    const isLoading = state.isLoading || state.isLoadingColumn()
    return [
        {
            loadTableDataCallback: () => {
                if (state.entities.length > 0 || isLoading) {
                    return
                }
                dispatch(new GetTableAsyncAction(apiPath)).then(async () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    columnDefinitionList.map(async (col: ColumnDefinition) => {
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
                        await dispatch(new GetColumnAsyncAction(apiPath, col))
                    })
                })
            }
        },
        {
            cellContentCallback: useCellContentCalback(state),
            addColumnCallback: (columnDefinition: ColumnDefinition) =>
                dispatch(new GetColumnAsyncAction(apiPath, columnDefinition)),
            showColumnAddMenuCallback: () => dispatch(new ShowColumnAddMenuAction()),
            hideColumnAddMenuCallback: () => dispatch(new HideColumnAddMenuAction()),
            showHeaderMenuCallback: (columnIdx: number, bounds: Rectangle) => {
                dispatch(new ShowHeaderMenuAction(columnIdx, bounds))
            },
            hideHeaderMenuCallback: () => dispatch(new HideHeaderMenuAction()),
            removeColumnCallback: () => dispatch(new RemoveSelectedColumnAction()),
            setColumnWidthCallback: (
                column: GridColumn,
                newSize: number,
                colIndex: number,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                newSizeWithGrow: number
            ) => dispatch(new SetColumnWidthAction(colIndex, newSize)),
            switchColumnsCallback: (startIndex: number, endIndex: number) =>
                dispatch(new ChangeColumnIndexAction(startIndex, endIndex)),
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
            })
        },
        {
            entities: state.entities,
            columnStates: state.columnStates,
            columnIndices: state.columnIndices,
            frozenColumns: state.frozenColumns,
            isShowColumnAddMenu: state.showColumnAddMenu,
            selectedColumnHeaderBounds: state.selectedColumnHeaderBounds,
            errorMsg: state.errorMsg,
            isLoading: isLoading,
            baseUrl: apiPath
        }
    ]
}
