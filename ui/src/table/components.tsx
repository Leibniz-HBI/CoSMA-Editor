import {
    DataEditor,
    EditableGridCell,
    GridColumn,
    Item
} from '@glideapps/glide-data-grid'
import { useCallback, useLayoutEffect } from 'react'
import { Button, Col, Modal, Row, Toast, ToastContainer } from 'react-bootstrap'
import { useLayer } from 'react-laag'
import { ColumnMenu } from '../column_menu/components/menu'
import { ColumnAddButton } from '../column_menu/components/misc'
import { HeaderMenu } from '../header_menu'
import { useRemoteTableData, LocalTableCallbacks, TableDataProps } from './hooks'
import { DefaultTagDefinitionsCallbacks } from '../user/hooks'
import { UserInfo } from '../user/state'

export function downloadWorkAround(csvLines: string[]) {
    const blob = new Blob(csvLines, {
        type: 'text/csv;charset=utf-8',
        endings: 'native'
    })
    const element = document.createElement('a')
    const url = window.URL.createObjectURL(blob)
    element.setAttribute('href', url)
    element.setAttribute('download', 'cosmae.csv')

    element.style.display = 'none'
    document.body.appendChild(element)

    element.click()

    document.body.removeChild(element)
    window.URL.revokeObjectURL(url)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RemoteDataTable(props: {
    userInfoPromise: () => Promise<UserInfo | undefined>
    defaultColumnCallbacks: DefaultTagDefinitionsCallbacks
}) {
    const [remoteCallbacks, localCallbacks, syncInfo] = useRemoteTableData(
        props.userInfoPromise,
        props.defaultColumnCallbacks
    )
    useLayoutEffect(
        () => {
            remoteCallbacks.loadTableDataCallback()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    return (
        <Row className="h-100">
            <Col className="h-100 overflow-hidden d-flex flex-column">
                <Row className="ms-3 me-3 mb-3">
                    <Col xs="auto" className="ps-0 pe-0">
                        <Button
                            onClick={() =>
                                downloadWorkAround(localCallbacks.csvLines())
                            }
                        >
                            Download
                        </Button>
                    </Col>
                </Row>
                <Row
                    className="h-100 mb-2 ms-3 me-3"
                    data-testid="table-container-outer"
                >
                    <div
                        className="br-12 ps-0 pe-0 h-100 w-100 overflow-hidden"
                        data-testid="table-container-inner"
                    >
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
                            submitValueCallback={remoteCallbacks.submitValueCallback}
                        />
                        <Modal
                            show={syncInfo.isShowColumnAddMenu}
                            onHide={localCallbacks.hideColumnAddMenuCallback}
                            size="xl"
                        >
                            <Modal.Header closeButton>
                                <Modal.Title>Show Additional Tag Values</Modal.Title>
                            </Modal.Header>
                            <Modal.Body className="bg-secondary vh-85">
                                <ColumnMenu
                                    columnIndices={syncInfo.columnIndices}
                                    loadColumnDataCallback={
                                        localCallbacks.addColumnCallback
                                    }
                                />
                            </Modal.Body>
                        </Modal>
                    </div>
                </Row>
                <div id="portal" />
            </Col>
        </Row>
    )
}

export function DataTable(props: {
    tableProps: TableDataProps
    tableCallbacks: LocalTableCallbacks
    submitValueCallback: (cell: Item, newValues: EditableGridCell) => void
}) {
    const {
        entities,
        columnStates,
        frozenColumns,
        selectedColumnHeaderBounds,
        isLoading,
        loadDataErrorState,
        submitValuesErrorState
    } = props.tableProps
    const {
        cellContentCallback,
        removeColumnCallback,
        showColumnAddMenuCallback,
        showHeaderMenuCallback,
        hideHeaderMenuCallback,
        setColumnWidthCallback,
        switchColumnsCallback,
        columnHeaderBoundsCallback,
        clearSubmitValueErrorCallback
    } = props.tableCallbacks
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

    if (isLoading || entities === undefined) {
        return <div className="shimmer"></div>
    } else if (!(loadDataErrorState === undefined)) {
        return (
            <div>
                <p>Error: {loadDataErrorState.msg}</p>
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
                            <button onClick={showColumnAddMenuCallback}>+</button>
                        </ColumnAddButton>
                    }
                    rightElementProps={{
                        fill: false,
                        sticky: true
                    }}
                    onHeaderMenuClick={showHeaderMenuCallback}
                    onColumnResize={setColumnWidthCallback}
                    onColumnMoved={switchColumnsCallback}
                    onCellEdited={props.submitValueCallback}
                />
                {headerMenuOpen &&
                    renderLayer(
                        <div {...layerProps}>
                            <HeaderMenu
                                closeHeaderMenuCallback={hideHeaderMenuCallback}
                                removeColumnCallback={removeColumnCallback}
                            />
                        </div>
                    )}
                {!!submitValuesErrorState && (
                    <ToastContainer position="bottom-end" className="p-3">
                        <Toast onClose={clearSubmitValueErrorCallback}>
                            <Toast.Header className="bg-danger" closeVariant="white">
                                <strong className="me-auto">Error</strong>
                            </Toast.Header>
                            <Toast.Body>
                                <Row>{submitValuesErrorState.msg}</Row>
                                {!!submitValuesErrorState.retryCallback && (
                                    <div className="d-flex justify-content-end">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={
                                                submitValuesErrorState.retryCallback
                                            }
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                )}
                            </Toast.Body>
                        </Toast>
                    </ToastContainer>
                )}
            </>
        )
    }
}
