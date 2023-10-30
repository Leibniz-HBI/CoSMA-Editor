import { ReactElement, ReactNode } from 'react'
import { Col, Form, Row } from 'react-bootstrap'

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
    if (namePath.length > 3) {
        return [
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
    }

    return [
        <span className="pre-wrap" key="path-part-0">
            {namePath[0] + ' '}
        </span>,
        ...namePath.slice(1).map((namePart: string, idx: number) => (
            <span className="pre-wrap" key={`path-part-${idx + 1}`}>
                {'-> ' + namePart + ' '}
            </span>
        ))
    ]
}

export function ColumnSelector(props: { listEntries: ReactNode[] }) {
    return (
        <Col>
            <Row className="row mt-2">
                <Col>
                    <Form.FloatingLabel label="Search">
                        <Form.Control type="text" name="name" placeholder="Search" />
                    </Form.FloatingLabel>
                </Col>
            </Row>
            <Row>
                <Col>
                    <ul
                        className="list-group pe-0 mb-1 overflow-y-auto"
                        style={{ maxHeight: '60vh' }}
                    >
                        {props.listEntries}
                    </ul>
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
        <li
            className="list-group-item d-flex flex-row justify-content-between"
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
        </li>
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
                        version: 0
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
            ...mkListItems({ ...args, level: 1, additionalEntries: undefined })
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
