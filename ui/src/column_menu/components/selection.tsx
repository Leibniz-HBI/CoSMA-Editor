import { ReactElement } from 'react'
import { Button, Col, ListGroup, Modal, Row } from 'react-bootstrap'

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
import { clearEditTagDefinition, setEditTagDefinition, toggleExpansion } from '../slice'
import { selectEditTagDefinition, selectNavigationEntries } from '../selectors'
import { changeTagDefinitionParent } from '../thunks'

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
    additionalEntries = []
}: {
    mkTailElement: (def: TagDefinition) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
}) {
    const tagSelectionEntries = useAppSelector(selectNavigationEntries)
    const dispatch = useAppDispatch()
    const toggleExpansionCallback = (path: number[]) => dispatch(toggleExpansion(path))
    const setEditTagDefinitionCallback = (tagDef: TagDefinition) =>
        dispatch(setEditTagDefinition(tagDef))
    const editTagDefinition = useAppSelector(selectEditTagDefinition)
    const closeEditCallback = () => dispatch(clearEditTagDefinition())
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
        <>
            <Col className="overflow-y-hidden pb-3 d-flex flex-column scroll-gutter">
                {/* <Row className="row mt-2 flex-grow-0 flex-shrink-0">
                <Col>
                    <Form.FloatingLabel label="Search">
                        <Form.Control type="text" name="name" placeholder="Search" />
                    </Form.FloatingLabel>
                </Col>
            </Row> */}
                <Row className="overflow-y-scroll flex-grow-1 flex-shrink-1 pe-2">
                    <ListGroup className="pe-0 mb-1">
                        {mkListItems({
                            tagSelectionEntries,
                            level: 0,
                            path: [],
                            mkTailElement,
                            toggleExpansionCallback,
                            startEditCallback: setEditTagDefinitionCallback,
                            additionalEntries,
                            changeParentCallback
                        })}
                    </ListGroup>
                </Row>
            </Col>
            <Modal
                show={editTagDefinition.value !== undefined}
                size="xl"
                onHide={closeEditCallback}
                className="h-100"
            >
                <Modal.Header closeButton={true}>
                    <div className="modal-title h4">Edit Tag Definition</div>
                </Modal.Header>
                <Modal.Body className="bg-secondary vh-85">
                    {
                        <EditTabBody
                            tagDefinition={editTagDefinition.value}
                            closeEditCallback={closeEditCallback}
                        />
                    }
                </Modal.Body>
            </Modal>
        </>
    )
}

function EditTabBody({
    tagDefinition,
    closeEditCallback
}: {
    tagDefinition?: TagDefinition
    closeEditCallback: VoidFunction
}) {
    if (tagDefinition === undefined) {
        return <div>ERROR: No tag definition selected</div>
    }
    return (
        <Col className="h-100">
            <Row>
                <div>{constructColumnTitleSpans(tagDefinition.namePath)}</div>{' '}
            </Row>
            <Row>
                <Col>
                    <Button onClick={closeEditCallback}>Cancel</Button>
                    <Button
                        onClick={() => {
                            closeEditCallback()
                        }}
                    >
                        Save
                    </Button>
                </Col>
            </Row>
        </Col>
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
export function mkColumnExplorerItem({
    columnSelectionEntry,
    path,
    toggleExpansionCallback,
    expansionGroup,
    level,
    mkTailElement,
    startEditCallback,
    changeParentCallback
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
}): ReactElement {
    const { columnDefinition, isLoading, children, isExpanded } = columnSelectionEntry
    const tailElement = mkTailElement(columnDefinition)
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
            <Col className="me-2">
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
                    <Col className="me-auto">
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
    startEditCallback: (tagDef: TagDefinition) => void
    changeParentCallback: (props: {
        entry: TagSelectionEntry
        idParentPersistent: string
        oldPath: number[]
        newPath: number[]
    }) => void
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
        changeParentCallback
    } = args
    if (additionalEntries !== undefined) {
        const additionalItems = additionalEntries.map((entry, idx) =>
            mkColumnExplorerItem({
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
                startEditCallback,
                changeParentCallback
            })
        )
        return [
            ...additionalItems,
            ...mkListItems({ ...args, level: 0, additionalEntries: undefined })
        ]
    }
    return tagSelectionEntries.flatMap((entry: TagSelectionEntry, idx: number) => {
        const newPath = [...path, idx]
        const item = mkColumnExplorerItem({
            columnSelectionEntry: entry,
            path: newPath,
            toggleExpansionCallback: toggleExpansionCallback,
            expansionGroup: expansionGroup,
            level: level,
            mkTailElement: mkTailElement,
            startEditCallback,
            changeParentCallback
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
