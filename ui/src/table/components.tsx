import {
    DataEditor,
    EditableGridCell,
    GridColumn,
    GridMouseEventArgs,
    Item
} from '@glideapps/glide-data-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Col, Modal, Row } from 'react-bootstrap'
import { IBounds, useLayer } from 'react-laag'
import { ColumnMenu } from '../column_menu/components/menu'
import { ColumnAddButton } from '../column_menu/components/misc'
import { HeaderMenu } from '../header_menu'
import { useRemoteTableData, LocalTableCallbacks, TableDataProps } from './hooks'
import { UserInfo } from '../user/state'
import { drawCell } from './draw'
import { ChangeOwnershipModal } from '../tag_management/components'
import { AddEntityForm } from '../entity/components'
import { MergeEntitiesButton } from './selection/components'
import { mkGridSelectionCallback } from './selection/slice'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../store'
import { selectTableSelection } from './selection/selectors'
import { EntityMergeRequestConflictComponent } from '../merge_request/entity/conflicts/components'
import { constructColumnTitle } from '../contribution/entity/hooks'

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
}) {
    const [remoteCallbacks, localCallbacks, syncInfo] = useRemoteTableData(
        props.userInfoPromise
    )
    useEffect(
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
                    <Col className="ps-0">
                        <Row className="justify-content-start">
                            <Col xs="auto">
                                <Button
                                    onClick={localCallbacks.showEntityAddMenuCallback}
                                >
                                    Add Entity
                                </Button>
                            </Col>
                            <Col className="ps-0">
                                <MergeEntitiesButton
                                    entityIdArray={syncInfo.entities}
                                    mergeRequestCreatedCallback={
                                        localCallbacks.showEntityMergingModalCallback
                                    }
                                />
                            </Col>
                        </Row>
                    </Col>
                    <Col
                        xs="auto"
                        onClick={() =>
                            localCallbacks.toggleSearchCallback(!syncInfo.showSearch)
                        }
                    >
                        <Button>Search</Button>
                    </Col>
                    <Col xs="auto" className="pe-0">
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
                            key="column-menu-modal"
                            className="h-100"
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
                        <Modal
                            show={syncInfo.showEntityAddMenu}
                            onHide={localCallbacks.hideEntityAddMenuCallback}
                            size="xl"
                            key="entity-add-modal"
                        >
                            <Modal.Header>
                                <Modal.Title>Add new Entity</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <AddEntityForm
                                    state={syncInfo.entityAddState}
                                    addEntityCallback={
                                        remoteCallbacks.addEntityCallback
                                    }
                                />
                            </Modal.Body>
                        </Modal>
                        <Modal
                            show={syncInfo.showEntityMergingModal}
                            onHide={localCallbacks.hideEntityMergingModalCallback}
                            size="xl"
                            // fullscreen={true}
                            key="entity-merging-modal"
                        >
                            <Modal.Body className="display-block vh-95">
                                <EntityMergeRequestConflictComponent
                                    loadDataCallback={
                                        remoteCallbacks.loadTableDataCallback
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

const zeroBounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0
}

export function DataTable(props: {
    tableProps: TableDataProps
    tableCallbacks: LocalTableCallbacks
    submitValueCallback: (cell: Item, newValues: EditableGridCell) => void
}) {
    const dispatch: AppDispatch = useDispatch()
    const tableSelection = useSelector(selectTableSelection)
    const {
        entities,
        columnStates,
        frozenColumns,
        selectedColumnHeaderBounds,
        isLoading,
        columnHeaderMenuEntries,
        tagDefinitionChangeOwnership,
        showSearch
    } = props.tableProps
    const {
        cellContentCallback,
        showColumnAddMenuCallback,
        showHeaderMenuCallback,
        hideHeaderMenuCallback,
        setColumnWidthCallback,
        switchColumnsCallback,
        columnHeaderBoundsCallback,
        hideTagDefinitionOwnershipCallback,
        updateTagDefinitionCallback,
        toggleSearchCallback
    } = props.tableCallbacks
    const headerMenuOpen = selectedColumnHeaderBounds !== undefined
    const { layerProps: columnMenuLayerProps, renderLayer: columnMenuRenderLayer } =
        useLayer({
            isOpen: headerMenuOpen,
            auto: true,
            placement: 'bottom-end',
            onOutsideClick: hideHeaderMenuCallback,
            trigger: {
                getBounds: columnHeaderBoundsCallback
            }
        })
    const [tooltip, setTooltip] = useState<
        { val: string; bounds: IBounds } | undefined
    >()
    const { layerProps: tooltipLayerProps, renderLayer: tooltipRenderLayer } = useLayer(
        {
            isOpen: tooltip !== undefined,
            triggerOffset: 4,
            auto: true,
            container: 'portal',
            trigger: {
                getBounds: () => tooltip?.bounds ?? zeroBounds
            }
        }
    )

    const timeoutRef = useRef(0)

    const onItemHovered = useCallback(
        (args: GridMouseEventArgs) => {
            if (
                args.kind === 'cell' &&
                args.location[0] == 0 &&
                entities !== undefined
            ) {
                window.clearTimeout(timeoutRef.current)
                setTooltip(undefined)
                let tooltipValue = ''
                const displayTxtDetails = entities[args.location[1]].displayTxtDetails
                if (displayTxtDetails === undefined) {
                    tooltipValue = 'Unknown display txt source'
                } else if (typeof displayTxtDetails == 'string') {
                    tooltipValue = displayTxtDetails
                } else {
                    tooltipValue = constructColumnTitle(displayTxtDetails.namePath)
                }
                timeoutRef.current = window.setTimeout(() => {
                    setTooltip({
                        val: `Display text source: ${tooltipValue}`,
                        bounds: {
                            // translate to react-laag types
                            left: args.bounds.x,
                            top: args.bounds.y,
                            width: args.bounds.width,
                            height: args.bounds.height,
                            right: args.bounds.x + args.bounds.width,
                            bottom: args.bounds.y + args.bounds.height
                        }
                    })
                }, 1000)
            } else {
                window.clearTimeout(timeoutRef.current)
                timeoutRef.current = 0
                setTooltip(undefined)
            }
        },
        [entities]
    )

    if (isLoading || entities === undefined) {
        return <div className="shimmer"></div>
    } else {
        const columnDefs: GridColumn[] = []
        for (let i = 0; i < columnStates.length; ++i) {
            const columnState = columnStates[i]
            let title = columnState.name()
            if (columnState.tagDefinition.curated) {
                title = '☑ ' + title
            }
            columnDefs.push({
                id: columnState.tagDefinition.idPersistent,
                title,
                width: columnState.width,
                hasMenu: i >= frozenColumns
            })
        }

        return (
            <>
                <DataEditor
                    drawCell={drawCell}
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
                    rowMarkers="checkbox-visible"
                    gridSelection={tableSelection}
                    onGridSelectionChange={mkGridSelectionCallback(dispatch)}
                    onItemHovered={onItemHovered}
                    showSearch={showSearch}
                    onSearchClose={() => toggleSearchCallback(false)}
                    getCellsForSelection={true}
                />
                {headerMenuOpen &&
                    columnMenuRenderLayer(
                        <div {...columnMenuLayerProps}>
                            <HeaderMenu
                                closeHeaderMenuCallback={hideHeaderMenuCallback}
                                menuEntries={columnHeaderMenuEntries}
                            />
                        </div>
                    )}
                {tooltip != undefined &&
                    tooltipRenderLayer(
                        <div
                            {...tooltipLayerProps}
                            style={{
                                ...tooltipLayerProps.style,
                                padding: '8px 12px',
                                color: 'white',
                                font: '500 13px Inter',
                                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                borderRadius: 9
                            }}
                        >
                            {tooltip.val}
                        </div>
                    )}
                <ChangeOwnershipModal
                    tagDefinition={tagDefinitionChangeOwnership}
                    onClose={hideTagDefinitionOwnershipCallback}
                    updateTagDefinitionChangeCallback={updateTagDefinitionCallback}
                />
            </>
        )
    }
}
