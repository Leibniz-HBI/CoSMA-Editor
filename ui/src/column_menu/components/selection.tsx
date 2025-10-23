import { ReactElement, useContext, useState } from 'react'
import {
    Col,
    ListGroup,
    Modal,
    OverlayTrigger,
    Row,
    Spinner,
    Tooltip
} from 'react-bootstrap'

import { DashLg, PencilSquare, PlusLg, RecordFill } from 'react-bootstrap-icons'
import { Column, ColumnType, newColumn } from '../state'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    clearEditColumn,
    dragColumnEnd,
    dragColumnStart,
    setEditColumn,
    toggleExpansion
} from '../slice'
import {
    selectEditColumnDefinition,
    selectIsDragging,
    selectColumnHierarchy,
    ColumnHierarchyNode,
} from '../selectors'
import { changeColumnParent } from '../thunks'
import { CreateTabBody } from './menu'
import { newRemote } from '../../util/state'
import { ColumnNamePath } from './misc'
import {
    ColumnSearchField,
    ColumnExplorerSearchResults,
    ColumnSearchProvider,
    ColumnSearchContext
} from './search'

export function ColumnSelector({
    mkTailElement,
    additionalEntries = [],
    allowEdit = true,
    upUntilDate
}: {
    mkTailElement: (def: Column) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    allowEdit?: boolean
    upUntilDate?: Date | undefined
}) {
    return <ColumnSearchProvider>
        <ColumnSelectorBody
            mkTailElement={mkTailElement}
            additionalEntries={additionalEntries}
            allowEdit={allowEdit}
            upUntilDate={upUntilDate}
        />
    </ColumnSearchProvider>
}

function ColumnSelectorBody({
    mkTailElement,
    additionalEntries = [],
    allowEdit = true,
    upUntilDate
}: {
    mkTailElement: (def: Column) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    allowEdit?: boolean
    upUntilDate?: Date | undefined
}) {
                let body
                const searchResultList = useContext(ColumnSearchContext)
                if (searchResultList.value !== undefined) {
                    body = (
                        <ColumnExplorerSearchResults
                            upUntilDate={upUntilDate}
                            mkTailElement={mkTailElement}
                        />
                    )
                } else {
                    body = (
                        <ColumnExplorerList
                            mkTailElement={mkTailElement}
                            additionalEntries={additionalEntries}
                            allowEdit={allowEdit}
                            upUntilDate={upUntilDate}
                        />
                    )
                }
                return (
                    <Col className="overflow-y-hidden pb-3 d-contents">
                        <Row className="d-contents">
                            <ColumnSearchField upUntilDate={upUntilDate} />
                        </Row>
                        <Row className="d-contents">{body}</Row>
                    </Col>
                )
}

function ColumnExplorerList({
    mkTailElement,
    additionalEntries = [],
    allowEdit = true,
    upUntilDate
}: {
    mkTailElement: (def: Column) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    allowEdit?: boolean
    upUntilDate?: Date | undefined
}) {
    const dispatch = useAppDispatch()
    const columnHierarchy = useAppSelector((state) =>
        selectColumnHierarchy(state, upUntilDate)
    )
    const toggleExpansionCallback = (path: number[]) => dispatch(toggleExpansion(path))
    const setEditColumnCallback = allowEdit
        ? (column: Column) => dispatch(setEditColumn(column))
        : undefined
    const changeParentCallback = ({
        column,
        idParentNewPersistent,
        oldPathToColumn,
        pathToNewParent
    }: {
        column: Column
        idParentNewPersistent: string | undefined
        oldPathToColumn: number[]
        pathToNewParent: number[]
    }) =>
        dispatch(
            changeColumnParent({
                column,
                idParentNewPersistent,
                oldPathToColumn,
                pathToNewParent
            })
        )
    const dragColumnStartCallback = () => dispatch(dragColumnStart())
    const dragColumnEndCallback = () => dispatch(dragColumnEnd())
    return (
        <Col className="d-contents">
            <Row className="flex-grow-0 flex-shrink-0">
                <NoParentEntry changeParentCallback={changeParentCallback} />
            </Row>
            <Row className="overflow-y-auto flex-grow-1 flex-shrink-1 ms-2 me-1 scroll-gutter">
                <ListGroup>
                    {mkListItems({
                        columnSelectionEntries: columnHierarchy,
                        level: 0,
                        path: [],
                        mkTailElement,
                        toggleExpansionCallback,
                        startEditCallback: setEditColumnCallback,
                        additionalEntries,
                        changeParentCallback,
                        dragColumnStartCallback,
                        dragColumnEndCallback,
                        allowEdit
                    })}
                </ListGroup>
            </Row>
        </Col>
    )
}

export function EditModal() {
    const editColumn = useAppSelector(selectEditColumnDefinition)
    const dispatch = useAppDispatch()
    const closeEditCallback = () => dispatch(clearEditColumn())
    return (
        <Modal
            show={editColumn.value !== undefined}
            size="xl"
            onHide={closeEditCallback}
            className="overflow-hidden"
            contentClassName="vh-95 d-flex flex-column bg-secondary flex-sm-wrap flex-md-nowrap"
        >
            <Modal.Header closeButton className="flex-grow-0 flex-shrink-0 bg-white">
                <div className="modal-title h4">Edit Column</div>
            </Modal.Header>
            <Modal.Body className="bg-secondary d-contents">
                {<CreateTabBody existingColumn={editColumn.value} />}
            </Modal.Body>
        </Modal>
    )
}

function NoParentEntry({
    changeParentCallback
}: {
    changeParentCallback: (props: {
        column: Column
        idParentNewPersistent: string | undefined
        oldPathToColumn: number[]
        pathToNewParent: number[]
    }) => void
}) {
    const isDragging = useAppSelector(selectIsDragging)
    let colorClass = 'bg-secondary'
    if (isDragging) {
        colorClass = 'bg-dark'
    }
    const innerClass = colorClass + ' rounded mt-2 mb-2 me-4'
    const [showOverlay, setShowOverlay] = useState(false)
    return (
        <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip>Drop here to set no parent for column</Tooltip>}
            show={showOverlay && isDragging}
        >
            <div
                data-testid="no-parent-drop-zone"
                onDragOver={(event) => {
                    event.preventDefault()
                    setShowOverlay(true)
                }}
                onDragLeave={(_event) => {
                    setShowOverlay(false)
                }}
                onDrop={(event) => {
                    const column = JSON.parse(
                        event.dataTransfer.getData('column')
                    ) as Column
                    const oldPathToColumn = JSON.parse(
                        event.dataTransfer.getData('path')
                    ) as number[]
                    changeParentCallback({
                        column,
                        idParentNewPersistent: undefined,
                        oldPathToColumn,
                        pathToNewParent: []
                    })
                }}
            >
                <div className={innerClass} style={{ height: '4px' }}></div>
            </div>
        </OverlayTrigger>
    )
}

export function ColumnExplorerExpandIcon(props: {
    isLoading: boolean
    isExpandable: boolean
    isExpanded: boolean
    expandCallback?: () => void
}) {
    let icon
    if (props.isLoading) {
        icon = <div className="spinner-border spinner-border-sm" role="status"></div>
    } else if (props.isExpandable) {
        if (props.isExpanded) {
            icon = <DashLg size={20} />
        } else {
            icon = <PlusLg size={20} />
        }
    } else {
        icon = <RecordFill size={12} width={20} />
    }
    return (
        <span className="icon" onClick={props.expandCallback}>
            {icon}
        </span>
    )
}

export function ColumnExplorerItem({
    columnNode,
    path,
    toggleExpansionCallback = undefined,
    expansionGroup,
    level,
    mkTailElement,
    startEditCallback,
    changeParentCallback = undefined,
    dragColumnStartCallback = undefined,
    dragColumnEndCallback = undefined
}: {
    columnNode: ColumnHierarchyNode
    path: number[]
    toggleExpansionCallback?: (path: number[], group?: string) => void
    expansionGroup?: string
    level: number
    mkTailElement: (def: Column) => ReactElement
    startEditCallback: ((column: Column) => void) | undefined
    changeParentCallback?: (props: {
        column: Column
        idParentNewPersistent: string
        oldPathToColumn: number[]
        pathToNewParent: number[]
    }) => void
    dragColumnStartCallback?: VoidFunction
    dragColumnEndCallback?: VoidFunction
}) {
    const column = columnNode.column?.value
    if (column === undefined) {
        return <Spinner />
    }
    const tailElement = mkTailElement(column)
    const expandable = columnNode.children.length > 0
    let expandCallback = undefined
    if (expandable && toggleExpansionCallback !== undefined) {
        expandCallback = () => toggleExpansionCallback(path, expansionGroup)
    }
    let editButton = <div />
    if (startEditCallback !== undefined) {
        editButton = <PencilSquare onClick={() => startEditCallback(column)} />
    }
    return (
        <ListGroup.Item
            className="d-flex flex-row justify-content-between"
            key={column.idPersistent}
            role="button"
            draggable={dragColumnStartCallback !== undefined}
            onDragStart={(event) => {
                event.dataTransfer.setData('column', JSON.stringify(column))
                event.dataTransfer.setData('path', JSON.stringify(path))
                dragColumnStartCallback?.()
            }}
            onDragEnd={(_event) => {
                dragColumnEndCallback?.()
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
                const columnDropped = JSON.parse(
                    event.dataTransfer.getData('column')
                ) as Column
                const oldPathToColumn = JSON.parse(
                    event.dataTransfer.getData('path')
                ) as number[]
                changeParentCallback?.({
                    column: columnDropped,
                    idParentNewPersistent: column.idPersistent,
                    oldPathToColumn,
                    pathToNewParent: path
                })
            }}
        >
            <Col
                className="me-2"
                onDragStart={(event) => event.preventDefault()}
                onDragEnd={(event) => event.preventDefault()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
            >
                <div className="d-flex flex-row justify-content-start">
                    <Col xs="auto">
                        {Array.from(
                            { length: level },
                            (_value: number, idx: number) => (
                                <span className="indent" key={`indent-${idx}`} />
                            )
                        )}
                        <ColumnExplorerExpandIcon
                            isLoading={columnNode.column.isLoading}
                            isExpandable={expandable}
                            isExpanded={columnNode.isExpanded}
                            expandCallback={expandCallback}
                        />
                    </Col>
                    <Col
                        className="me-auto"
                        onDragStart={(event) => event.preventDefault()}
                        onDragEnd={(event) => event.preventDefault()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => event.preventDefault()}
                    >
                        <ColumnNamePath column={column} />
                    </Col>
                    <Col xs="auto" className="me-2">
                        {editButton}
                    </Col>
                </div>
            </Col>
            {tailElement}
        </ListGroup.Item>
    )
}

export function mkListItems(args: {
    columnSelectionEntries: ColumnHierarchyNode[]
    path: number[]
    toggleExpansionCallback: (path: number[], group?: string) => void
    level: number
    mkTailElement: (def: Column) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    expansionGroup?: string
    startEditCallback?: (column: Column) => void
    changeParentCallback: (props: {
        column: Column
        idParentNewPersistent: string | undefined
        oldPathToColumn: number[]
        pathToNewParent: number[]
    }) => void
    dragColumnStartCallback: VoidFunction
    dragColumnEndCallback: VoidFunction
    allowEdit: boolean
}): ReactElement[] {
    const {
        columnSelectionEntries,
        path,
        toggleExpansionCallback,
        expansionGroup,
        level,
        mkTailElement,
        additionalEntries,
        startEditCallback,
        changeParentCallback,
        dragColumnStartCallback,
        dragColumnEndCallback
    } = args
    if (additionalEntries !== undefined) {
        const additionalItems = additionalEntries.map((entry, idx) =>
            //TODO split selector logic from component to allow additional items.
            ColumnExplorerItem({
                columnNode: {
                    name: entry.name,
                    idColumnPersistent: entry.idPersistent,
                    column: newRemote(
                        newColumn({
                            namePath: [entry.name],
                            idPersistent: entry.idPersistent,
                            columnType: ColumnType.Inner,
                            curated: true,
                            version: 0,
                            hidden: false
                        })
                    ),
                    isExpanded: false,
                    children: []
                },
                path: [-idx],
                expansionGroup: expansionGroup,
                level: 0,
                mkTailElement: mkTailElement,
                startEditCallback: undefined
            })
        )
        return [
            ...additionalItems,
            ...mkListItems({ ...args, level: 0, additionalEntries: undefined })
        ]
    }
    return columnSelectionEntries.flatMap((entry: ColumnHierarchyNode, idx: number) => {
        const newPath = [...path, idx]
        const item = ColumnExplorerItem({
            columnNode: entry,
            path: newPath,
            toggleExpansionCallback: toggleExpansionCallback,
            expansionGroup: expansionGroup,
            level: level,
            mkTailElement: mkTailElement,
            startEditCallback,
            changeParentCallback,
            dragColumnStartCallback,
            dragColumnEndCallback
        })
        if (entry.isExpanded) {
            return [
                item,
                ...mkListItems({
                    ...args,
                    columnSelectionEntries: entry.children,
                    level: level + 1,
                    path: newPath
                })
            ]
        }
        return [item]
    })
}
