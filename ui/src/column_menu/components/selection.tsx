import { ReactElement, useState } from 'react'
import { Col, ListGroup, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'

import {
    DashLg,
    PatchCheckFill,
    PencilSquare,
    PlusLg,
    RecordFill
} from 'react-bootstrap-icons'
import {
    TagDefinition,
    TagSelectionEntry,
    TagType,
    newTagDefinition,
    newTagSelectionEntry
} from '../state'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    clearEditTagDefinition,
    dragTagDefinitionEnd,
    dragTagDefinitionStart,
    setEditTagDefinition,
    toggleExpansion
} from '../slice'
import {
    selectEditTagDefinition,
    selectIsDragging,
    selectNavigationEntries
} from '../selectors'
import { changeTagDefinitionParent } from '../thunks'
import { CreateTabBody } from './menu'

export function constructColumnTitleSpans(namePath: string[]): ReactElement[] {
    if (namePath === undefined || namePath.length == 0) {
        return [<span>UNKNOWN</span>]
    }
    const pathSpans = [
        <span className="pre-wrap" key="path-part-0">
            {namePath[0] + ' '}
        </span>,
        <span className="pre-wrap" key="path-part-1">
            {'-> ... '}
        </span>,
        <span className="pre-wrap" key="path-part-2">
            {'-> ' + namePath[namePath.length - 2] + ' '}
        </span>,
        <span className="pre-wrap" key="path-part-3">
            {'-> ' + namePath[namePath.length - 1] + ' '}
        </span>
    ]
    if (namePath.length < 4) {
        pathSpans.splice(1, 4 - namePath.length)
    }

    return pathSpans
}

export function ColumnSelector({
    mkTailElement,
    additionalEntries = [],
    allowEdit = true
}: {
    mkTailElement: (def: TagDefinition) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    allowEdit?: boolean
}) {
    const tagSelectionEntries = useAppSelector(selectNavigationEntries)
    const dispatch = useAppDispatch()
    const toggleExpansionCallback = (path: number[]) => dispatch(toggleExpansion(path))
    const setEditTagDefinitionCallback = allowEdit
        ? (tagDef: TagDefinition) => dispatch(setEditTagDefinition(tagDef))
        : undefined
    const changeParentCallback = ({
        entry,
        idParentPersistent,
        oldPath,
        newPath
    }: {
        entry: TagSelectionEntry
        idParentPersistent: string
        oldPath: number[]
        newPath: number[]
    }) =>
        dispatch(
            changeTagDefinitionParent({
                tagSelectionEntry: entry,
                idParentPersistent,
                newPath,
                oldPath
            })
        )
    const dragTagDefinitionStartCallback = () => dispatch(dragTagDefinitionStart())
    const dragTagDefinitionEndCallback = () => dispatch(dragTagDefinitionEnd())
    // if (editTagDefinition !== undefined) {
    //     return (
    //         <Col className="overflow-y-hidden pb-3 d-flex flex-column scroll-gutter">
    //             <Row className="overflow-y-scroll flex-grow-1 flex-shrink-1 pe-2">
    //                 <EditTabBody
    //                     tagDefinition={editTagDefinition}
    //                     closeEditCallback={() => setEditTagDefinition(undefined)}
    //                 />
    //             </Row>
    //         </Col>
    //     )
    // }
    return (
        <Col className="overflow-y-hidden pb-3 d-contents">
            {/* <Row className="row mt-2 flex-grow-0 flex-shrink-0">
                <Col>
                    <Form.FloatingLabel label="Search">
                        <Form.Control type="text" name="name" placeholder="Search" />
                    </Form.FloatingLabel>
                </Col>
            </Row> */}
            <Row className="flex-grow-0 flex-shrink-0">
                <NoParentEntry changeParentCallback={changeParentCallback} />
            </Row>
            <Row className="overflow-y-auto flex-grow-1 flex-shrink-1 ms-2 me-1 scroll-gutter">
                <ListGroup>
                    {mkListItems({
                        tagSelectionEntries,
                        level: 0,
                        path: [],
                        mkTailElement,
                        toggleExpansionCallback,
                        startEditCallback: setEditTagDefinitionCallback,
                        additionalEntries,
                        changeParentCallback,
                        dragTagDefinitionStartCallback,
                        dragTagDefinitionEndCallback,
                        allowEdit
                    })}
                </ListGroup>
            </Row>
        </Col>
    )
}

export function EditModal() {
    const editTagDefinition = useAppSelector(selectEditTagDefinition)
    const dispatch = useAppDispatch()
    const closeEditCallback = () => dispatch(clearEditTagDefinition())
    return (
        <Modal
            show={editTagDefinition.value !== undefined}
            size="xl"
            onHide={closeEditCallback}
            className="overflow-hidden"
            contentClassName="vh-95 d-flex flex-column bg-secondary flex-sm-wrap flex-md-nowrap"
        >
            <Modal.Header closeButton className="flex-grow-0 flex-shrink-0 bg-white">
                <div className="modal-title h4">Edit Tag Definition</div>
            </Modal.Header>
            <Modal.Body className="bg-secondary d-contents">
                {<CreateTabBody existingTagDefinition={editTagDefinition.value} />}
            </Modal.Body>
        </Modal>
    )
}

function NoParentEntry({
    changeParentCallback
}: {
    changeParentCallback: (props: {
        entry: TagSelectionEntry
        idParentPersistent: string
        oldPath: number[]
        newPath: number[]
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
            overlay={<Tooltip>Drop here to set no parent for tag definition</Tooltip>}
            show={showOverlay}
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
                    const entry = JSON.parse(
                        event.dataTransfer.getData('tagSelectionEntry')
                    ) as TagSelectionEntry
                    const oldPath = JSON.parse(event.dataTransfer.getData('path'))
                    const newPath: number[] = []
                    changeParentCallback({
                        entry,
                        idParentPersistent: '',
                        oldPath,
                        newPath
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
    columnSelectionEntry,
    path,
    toggleExpansionCallback,
    expansionGroup,
    level,
    mkTailElement,
    startEditCallback,
    changeParentCallback,
    dragTagDefinitionStartCallback,
    dragTagDefinitionEndCallback
}: {
    columnSelectionEntry: TagSelectionEntry
    path: number[]
    toggleExpansionCallback: (path: number[], group?: string) => void
    expansionGroup?: string
    level: number
    mkTailElement: (def: TagDefinition) => ReactElement
    startEditCallback: ((TagDefinition: TagDefinition) => void) | undefined
    changeParentCallback: (props: {
        entry: TagSelectionEntry
        idParentPersistent: string
        oldPath: number[]
        newPath: number[]
    }) => void
    dragTagDefinitionStartCallback: VoidFunction
    dragTagDefinitionEndCallback: VoidFunction
}) {
    const { columnDefinition, isLoading, children, isExpanded } = columnSelectionEntry
    const tailElement = mkTailElement(columnDefinition)
    //const dispatch = useAppDispatch()
    let expandCallback = undefined
    if (columnSelectionEntry.children.length > 0) {
        expandCallback = () => toggleExpansionCallback(path, expansionGroup)
    }
    let curatedIcon = undefined
    if (columnDefinition.curated) {
        curatedIcon = (
            <span className="icon test-primary">
                <PatchCheckFill />
            </span>
        )
    }
    let editButton = <div />
    if (startEditCallback !== undefined) {
        editButton = (
            <PencilSquare onClick={() => startEditCallback(columnDefinition)} />
        )
    }
    return (
        <ListGroup.Item
            className="d-flex flex-row justify-content-between"
            key={columnDefinition.idPersistent}
            role="button"
            draggable={true}
            onDragStart={(event) => {
                event.dataTransfer.setData(
                    'tagSelectionEntry',
                    JSON.stringify(columnSelectionEntry)
                )
                event.dataTransfer.setData('path', JSON.stringify(path))
                dragTagDefinitionStartCallback()
            }}
            onDragEnd={(_event) => {
                dragTagDefinitionEndCallback()
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
                const entry = JSON.parse(
                    event.dataTransfer.getData('tagSelectionEntry')
                ) as TagSelectionEntry
                const oldPath = JSON.parse(event.dataTransfer.getData('path'))
                const newPath = path
                changeParentCallback({
                    entry,
                    idParentPersistent: columnDefinition.idPersistent,
                    oldPath,
                    newPath
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
                        {Array.from({ length: level }, (value: number, idx: number) => (
                            <span className="indent" key={`indent-${idx}`} />
                        ))}
                        <ColumnExplorerExpandIcon
                            isLoading={isLoading}
                            isExpandable={children.length > 0}
                            isExpanded={isExpanded}
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
                        {constructColumnTitleSpans(columnDefinition.namePath)}
                        {curatedIcon}
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
    tagSelectionEntries: TagSelectionEntry[]
    path: number[]
    toggleExpansionCallback: (path: number[], group?: string) => void
    level: number
    mkTailElement: (def: TagDefinition) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    expansionGroup?: string
    startEditCallback?: (tagDef: TagDefinition) => void
    changeParentCallback: (props: {
        entry: TagSelectionEntry
        idParentPersistent: string
        oldPath: number[]
        newPath: number[]
    }) => void
    dragTagDefinitionStartCallback: VoidFunction
    dragTagDefinitionEndCallback: VoidFunction
    allowEdit: boolean
}): ReactElement[] {
    const {
        tagSelectionEntries,
        path,
        toggleExpansionCallback,
        expansionGroup,
        level,
        mkTailElement,
        additionalEntries,
        startEditCallback,
        changeParentCallback,
        dragTagDefinitionStartCallback,
        dragTagDefinitionEndCallback
    } = args
    if (additionalEntries !== undefined) {
        const additionalItems = additionalEntries.map((entry, idx) =>
            ColumnExplorerItem({
                columnSelectionEntry: newTagSelectionEntry({
                    columnDefinition: newTagDefinition({
                        namePath: [entry.name],
                        idPersistent: entry.idPersistent,
                        columnType: TagType.Inner,
                        curated: true,
                        version: 0,
                        hidden: false
                    })
                }),
                path: [idx],
                toggleExpansionCallback: toggleExpansionCallback,
                expansionGroup: expansionGroup,
                level: 0,
                mkTailElement: mkTailElement,
                startEditCallback: undefined,
                changeParentCallback,
                dragTagDefinitionStartCallback,
                dragTagDefinitionEndCallback
            })
        )
        return [
            ...additionalItems,
            ...mkListItems({ ...args, level: 0, additionalEntries: undefined })
        ]
    }
    return tagSelectionEntries.flatMap((entry: TagSelectionEntry, idx: number) => {
        const newPath = [...path, idx]
        const item = ColumnExplorerItem({
            columnSelectionEntry: entry,
            path: newPath,
            toggleExpansionCallback: toggleExpansionCallback,
            expansionGroup: expansionGroup,
            level: level,
            mkTailElement: mkTailElement,
            startEditCallback,
            changeParentCallback,
            dragTagDefinitionStartCallback,
            dragTagDefinitionEndCallback
        })
        if (entry.isExpanded) {
            return [
                item,
                ...mkListItems({
                    ...args,
                    tagSelectionEntries: entry.children,
                    level: level + 1,
                    path: newPath
                })
            ]
        }
        return [item]
    })
}
