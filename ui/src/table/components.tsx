import {
    DataEditor,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell,
    Rectangle
} from '@glideapps/glide-data-grid'
import { useLayoutEffect, useCallback } from 'react'
import { tableReducer } from './reducer'
import { useLayer } from 'react-laag'
import { TableState } from './state'
import { GetTableAsyncAction, GetColumnAsyncAction } from './async_actions'
import { useThunkReducer } from '../util/state'
import { ColumnAddButton, ColumnMenu } from '../column_menu/components'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import {
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ShowColumnAddMenuAction,
    ShowHeaderMenuAction
} from './actions'
import { HeaderMenu } from '../header_menu'

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

export function useCellContentCalback(state: TableState) {
    return useCallback(
        (cell: Item): GridCell => {
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
        },
        [state.entities, state.columnStates]
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RemoteDataTable(props: any) {
    const [state, dispatch] = useThunkReducer(tableReducer, new TableState({}))
    useLayoutEffect(() => {
        new GetTableAsyncAction(props.base_url).run(dispatch, state).then(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props.column_defs.map(async (col: ColumnDefinition) => {
                await new GetColumnAsyncAction(props.base_url, col).run(dispatch, state)
            })
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.column_defs])
    const cellContent = useCellContentCalback(state)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function addColumnCallback(columnDefinition: ColumnDefinition) {
        new GetColumnAsyncAction(props.base_url, columnDefinition).run(dispatch, state)
    }

    return (
        <div className="cosmae-table-page-container">
            <div className="cosmae-table-page-body">
                <DataTable
                    state={state}
                    cellContent={cellContent}
                    addColumnCallback={addColumnCallback}
                    showColumnAddMenuCallback={() =>
                        dispatch(new ShowColumnAddMenuAction())
                    }
                    closeColumnAddMenuCallback={() =>
                        dispatch(new HideColumnAddMenuAction())
                    }
                    openHeaderMenuCallback={useCallback(
                        (columnIdx: number, bounds: Rectangle) => {
                            dispatch(new ShowHeaderMenuAction(columnIdx, bounds))
                        },
                        // eslint-disable-next-line react-hooks/exhaustive-deps
                        []
                    )}
                    closeHeaderMenuCallback={useCallback(
                        () => dispatch(new HideHeaderMenuAction()),
                        // eslint-disable-next-line react-hooks/exhaustive-deps
                        []
                    )}
                    removeColumnCallback={() => {
                        dispatch(new RemoveSelectedColumnAction())
                    }}
                    setColumnWidthCallback={(
                        column: GridColumn,
                        newSize: number,
                        colIndex: number,
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        newSizeWithGrow: number
                    ) => {
                        dispatch(new SetColumnWidthAction(colIndex, newSize))
                    }}
                />
            </div>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable(props: any) {
    const {
        state,
        cellContent,
        addColumnCallback,
        showColumnAddMenuCallback,
        closeColumnAddMenuCallback,
        openHeaderMenuCallback,
        closeHeaderMenuCallback,
        setColumnWidthCallback
    } = props
    const {
        layerProps: columnAddMenuLayerProps,
        triggerProps: columnAddMenuTriggerProps,
        renderLayer: columnAddMenuRenderLayer
    } = useLayer({
        isOpen: state.showColumnAddMenu,
        placement: 'bottom-end',
        onOutsideClick: closeColumnAddMenuCallback
    })
    const headerMenuOpen = state.selectedColumnHeaderBounds !== undefined
    const { layerProps, renderLayer } = useLayer({
        isOpen: headerMenuOpen,
        auto: true,
        placement: 'bottom-end',
        onOutsideClick: undefined,
        trigger: {
            getBounds: () => ({
                left: state.selectedColumnHeaderBounds.x ?? 0,
                top: state.selectedColumnHeaderBounds.y ?? 0,
                width: state.selectedColumnHeaderBounds.width ?? 0,
                height: state.selectedColumnHeaderBounds.height ?? 0,
                right:
                    (state.selectedColumnHeaderBounds.x ?? 0) +
                    (state.selectedColumnHeaderBounds.width ?? 0),
                bottom:
                    (state.selectedColumnHeaderBounds.y ?? 0) +
                    (state.selectedColumnHeaderBounds.height ?? 0)
            })
        }
    })

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
        for (let i = 0; i < state.columnStates.length; ++i) {
            const columnState = state.columnStates[i]
            columnDefs.push({
                id: columnState.idPersistent,
                title: columnState.name,
                width: columnState.width,
                hasMenu: i > 0
            })
        }

        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <>
                        <DataEditor
                            rows={state.entities.length}
                            columns={columnDefs}
                            getCellContent={cellContent}
                            width="100%"
                            height="100%"
                            freezeColumns={1}
                            rightElement={
                                <ColumnAddButton>
                                    <button
                                        {...columnAddMenuTriggerProps}
                                        onClick={showColumnAddMenuCallback}
                                    >
                                        +
                                    </button>
                                </ColumnAddButton>
                            }
                            rightElementProps={{
                                fill: false,
                                sticky: true
                            }}
                            onHeaderMenuClick={openHeaderMenuCallback}
                            onColumnResize={setColumnWidthCallback}
                        />
                        {state.showColumnAddMenu &&
                            columnAddMenuRenderLayer(
                                <div {...columnAddMenuLayerProps}>
                                    <ColumnMenu addColumnCallback={addColumnCallback} />
                                </div>
                            )}
                        {headerMenuOpen &&
                            renderLayer(
                                <div {...layerProps}>
                                    <HeaderMenu
                                        closeHeaderMenuCallback={
                                            closeHeaderMenuCallback
                                        }
                                        removeColumnCallback={
                                            props.removeColumnCallback
                                        }
                                    />
                                </div>
                            )}
                    </>
                </div>
            </div>
        )
    }
}
