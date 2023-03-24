import { DataEditor, GridColumn } from '@glideapps/glide-data-grid'
import { useCallback, useLayoutEffect } from 'react'
import { useLayer } from 'react-laag'
import { ColumnMenu } from '../column_menu/components/menu'
import { ColumnAddButton } from '../column_menu/components/misc'
import { HeaderMenu } from '../header_menu'
import { useRemoteTableData, LocalTableCallbacks, TableDataProps } from './hooks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RemoteDataTable(props: any) {
    const [remoteCallbacks, localCallbacks, syncInfo] = useRemoteTableData(
        props.base_url,
        props.column_defs
    )
    useLayoutEffect(
        () => {
            remoteCallbacks.loadTableDataCallback()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.column_defs, syncInfo.isLoading]
    )

    return (
        <div className="cosmae-table-page-container">
            <div className="cosmae-table-page-body">
                <DataTable
                    tableProps={syncInfo}
                    tableCallbacks={{
                        ...localCallbacks,
                        // eslint-disable-next-line react-hooks/exhaustive-deps
                        cellContentCallback: useCallback(
                            localCallbacks.cellContentCallback,
                            [syncInfo.entities, syncInfo.columnStates]
                        )
                    }}
                />
            </div>
        </div>
    )
}

export function DataTable(props: {
    tableProps: TableDataProps
    tableCallbacks: LocalTableCallbacks
}) {
    const {
        entities,
        columnStates,
        columnIndices,
        frozenColumns,
        selectedColumnHeaderBounds,
        isShowColumnAddMenu,
        isLoading,
        errorMsg,
        baseUrl
    } = props.tableProps
    const {
        cellContentCallback,
        addColumnCallback,
        removeColumnCallback,
        showColumnAddMenuCallback,
        hideColumnAddMenuCallback,
        showHeaderMenuCallback,
        hideHeaderMenuCallback,
        setColumnWidthCallback,
        switchColumnsCallback,
        columnHeaderBoundsCallback
    } = props.tableCallbacks
    const {
        layerProps: columnAddMenuLayerProps,
        triggerProps: columnAddMenuTriggerProps,
        renderLayer: columnAddMenuRenderLayer
    } = useLayer({
        isOpen: isShowColumnAddMenu,
        placement: 'bottom-end',
        onOutsideClick: hideColumnAddMenuCallback
    })
    const headerMenuOpen = selectedColumnHeaderBounds !== undefined
    const { layerProps, renderLayer } = useLayer({
        isOpen: headerMenuOpen,
        auto: true,
        placement: 'bottom-end',
        onOutsideClick: undefined,
        trigger: {
            getBounds: columnHeaderBoundsCallback
        }
    })

    if (isLoading) {
        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <div className="shimmer"></div>
                </div>
            </div>
        )
    } else if (!(errorMsg === undefined || errorMsg === null || errorMsg == '')) {
        return (
            <div>
                <p>Error: {errorMsg}</p>
            </div>
        )
    } else {
        const columnDefs: GridColumn[] = []
        for (let i = 0; i < columnStates.length; ++i) {
            const columnState = columnStates[i]
            columnDefs.push({
                id: columnState.idPersistent,
                title: columnState.name,
                width: columnState.width,
                hasMenu: i >= frozenColumns
            })
        }

        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <>
                        <DataEditor
                            rows={entities.length}
                            columns={columnDefs}
                            getCellContent={cellContentCallback}
                            width="100%"
                            height="100%"
                            freezeColumns={frozenColumns}
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
                            onHeaderMenuClick={showHeaderMenuCallback}
                            onColumnResize={setColumnWidthCallback}
                            onColumnMoved={switchColumnsCallback}
                        />
                        {isShowColumnAddMenu &&
                            columnAddMenuRenderLayer(
                                <div {...columnAddMenuLayerProps}>
                                    <ColumnMenu
                                        baseUrl={baseUrl}
                                        columnIndices={columnIndices}
                                        loadColumnDataCallback={addColumnCallback}
                                    />
                                </div>
                            )}
                        {headerMenuOpen &&
                            renderLayer(
                                <div {...layerProps}>
                                    <HeaderMenu
                                        closeHeaderMenuCallback={hideHeaderMenuCallback}
                                        removeColumnCallback={removeColumnCallback}
                                    />
                                </div>
                            )}
                    </>
                </div>
            </div>
        )
    }
}
