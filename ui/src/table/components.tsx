import {
    DataEditor,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell
} from '@glideapps/glide-data-grid'
import { useLayoutEffect, useCallback } from 'react'
import { tableReducer } from './reducer'
import { ColumnType, TableState } from './state'
import { GetTableAsyncAction, GetColumnAsyncAction } from './async_actions'
import { useThunkReducer } from '../util/state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mkCell(cellContent: any, columnType: ColumnType): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    const cellValues = cellContent?.values
    if (columnType == ColumnType.Boolean) {
        // workaround for typescript jest compatibility
        cellKind = 'boolean' as GridCellKind
        if (cellValues === undefined || cellValues === null) {
            cellContent = false
        } else {
            cellContent = true
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

export function mkCellContentCalback(state: TableState) {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const entity_id_persistent = state.entities[row_idx]
        const col = state.columnStates[col_idx]
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RemoteDataTable(props: any) {
    const [state, dispatch] = useThunkReducer(tableReducer, new TableState({}))
    useLayoutEffect(() => {
        new GetTableAsyncAction(props.base_url).run(dispatch, state).then(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props.column_defs.map(async (col: { [key: string]: any }) => {
                await new GetColumnAsyncAction(props.base_url, col).run(dispatch, state)
            })
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.column_defs])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const cellContent = useCallback(mkCellContentCalback(state), [
        state.entities,
        state.columnStates
    ])

    return (
        <div className="cosmae-table-page-container">
            <div className="cosmae-table-page-body">
                <DataTable state={state} cellContent={cellContent} />
            </div>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable(props: any) {
    const { state, cellContent } = props
    if (
        state.isLoading === undefined ||
        state.isLoading === null ||
        state.isLoading ||
        state.isLoadingColumn()
    ) {
        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <div className="shimmer"></div>
                </div>
            </div>
        )
    } else if (
        !(
            state.errorMsg === undefined ||
            state.errorMsg === null ||
            state.errorMsg === ''
        )
    ) {
        return (
            <div>
                <p>Error: {state.errorMsg}</p>
            </div>
        )
    } else {
        const columnDefs: GridColumn[] = []
        for (const columnState of state.columnStates) {
            columnDefs.push({
                id: columnState.idPersistent,
                title: columnState.name,
                width: columnState.width
            })
        }
        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <DataEditor
                        rows={state.entities.length}
                        columns={columnDefs}
                        getCellContent={cellContent}
                        width="100%"
                        height="100%"
                        freezeColumns={1}
                    />
                </div>
            </div>
        )
    }
}
