import { ReactElement, ReactNode } from 'react'
import { Col, Form, ListGroup, Row } from 'react-bootstrap'

import { DashLg, PatchCheckFill, PlusLg, RecordFill } from 'react-bootstrap-icons'
import {
    TagDefinition,
    TagSelectionEntry,
    TagType,
    newTagDefinition,
    newTagSelectionEntry
} from '../state'

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
            {'-> ' + namePath[namePath.length - 1]}
        </span>
    ]
    if (namePath.length < 4) {
        pathSpans.splice(1, 4 - namePath.length)
    }

    return pathSpans
}

export function ColumnSelector(props: { listEntries: ReactNode[] }) {
    return (
        <Col className="overflow-y-hidden pb-3 d-flex flex-column scroll-gutter">
            {/* <Row className="row mt-2 flex-grow-0 flex-shrink-0">
                <Col>
                    <Form.FloatingLabel label="Search">
                        <Form.Control type="text" name="name" placeholder="Search" />
                    </Form.FloatingLabel>
                </Col>
            </Row> */}
            <Row className="overflow-y-scroll flex-grow-1 flex-shrink-1 pe-2">
                <ListGroup className="pe-0 mb-1">{props.listEntries}</ListGroup>
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
export function mkColumnExplorerItem(props: {
    columnSelectionEntry: TagSelectionEntry
    path: number[]
    toggleExpansionCallback: (path: number[], group?: string) => void
    expansionGroup?: string
    level: number
    mkTailElement: (def: TagDefinition) => ReactElement
}) {
    const { columnDefinition, isLoading, children, isExpanded } =
        props.columnSelectionEntry
    const tailElement = props.mkTailElement(columnDefinition)
    let expandCallback = undefined
    if (props.columnSelectionEntry.children.length > 0) {
        expandCallback = () =>
            props.toggleExpansionCallback(props.path, props.expansionGroup)
    }
    let curatedIcon = undefined
    if (columnDefinition.curated) {
        curatedIcon = (
            <span className="icon test-primary">
                <PatchCheckFill />
            </span>
        )
    }
    return (
        <ListGroup.Item
            className="d-flex flex-row justify-content-between"
            key={`cosmae-tree-menu-item-${columnDefinition.idPersistent}`}
            role="button"
        >
            <Col className="me-1">
                <div className="d-flex flex-row justify-content-start">
                    <div>
                        {Array.from(
                            { length: props.level },
                            (value: number, idx: number) => (
                                <span className="indent" key={`indent-${idx}`} />
                            )
                        )}
                        <ColumnExplorerExpandIcon
                            isLoading={isLoading}
                            isExpandable={children.length > 0}
                            isExpanded={isExpanded}
                            expandCallback={expandCallback}
                        />
                    </div>
                    <Col>
                        {constructColumnTitleSpans(columnDefinition.namePath)}
                        {curatedIcon}
                    </Col>
                </div>
            </Col>
            {tailElement}
        </ListGroup.Item>
    )
}

export function mkListItems(args: {
    columnSelectionEntries: TagSelectionEntry[]
    path: number[]
    toggleExpansionCallback: (path: number[], group?: string) => void
    level: number
    mkTailElement: (def: TagDefinition) => ReactElement
    additionalEntries?: { idPersistent: string; name: string }[]
    expansionGroup?: string
}): ReactNode[] {
    const {
        columnSelectionEntries,
        path,
        toggleExpansionCallback,
        expansionGroup,
        level,
        mkTailElement,
        additionalEntries
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
                mkTailElement: mkTailElement
            })
        )
        return [
            ...additionalItems,
            ...mkListItems({ ...args, level: 0, additionalEntries: undefined })
        ]
    }
    return columnSelectionEntries.flatMap((entry: TagSelectionEntry, idx: number) => {
        const newPath = [...path, idx]
        const item = mkColumnExplorerItem({
            columnSelectionEntry: entry,
            path: newPath,
            toggleExpansionCallback: toggleExpansionCallback,
            expansionGroup: expansionGroup,
            level: level,
            mkTailElement: mkTailElement
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
