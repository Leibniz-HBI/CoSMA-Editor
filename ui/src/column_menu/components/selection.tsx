import { ReactElement, ReactNode } from 'react'
import { Col, Form, FormLabel, Row } from 'react-bootstrap'

import { DashLg, Eye, EyeFill, PlusLg, RecordFill } from 'react-bootstrap-icons'
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from '../state'
import { ColumnTypeCreateFormProps } from './form'

export function constructColumnTitleSpans(namePath: string[]): ReactElement[] {
    if (namePath === undefined || namePath.length == 0) {
        return [<span>UNKNOWN</span>]
    }
    if (namePath.length > 3) {
        return [
            <span className="no-wrap" key="path-part-0">
                {namePath[0] + ' '}
            </span>,
            <span className="no-wrap" key="path-part-1">
                {'-> ... '}
            </span>,
            <span className="no-wrap" key="path-part-2">
                {'-> ' + namePath[namePath.length - 2] + ' '}
            </span>,
            <span className="no-wrap" key="path-part-3">
                {'-> ' + namePath[namePath.length - 1]}
            </span>
        ]
    }

    return [
        <span className="no-wrap" key="path-part-0">
            {namePath[0] + ' '}
        </span>,
        ...namePath.slice(1).map((namePart: string, idx: number) => (
            <span className="no-wrap" key={`path-part-${idx + 1}`}>
                {'-> ' + namePart + ' '}
            </span>
        ))
    ]
}

export function ColumnSelector(props: {
    listEntryBuilderList: ((
        columnTypeCreateFormProps?: ColumnTypeCreateFormProps
    ) => ReactNode)[]
    columnTypeCreateFormProps?: ColumnTypeCreateFormProps
}) {
    return (
        <Col>
            <Row className="row mt-2">
                <Col>
                    <FormLabel>
                        <input type="text" name="name" placeholder="Search" />
                    </FormLabel>
                </Col>
            </Row>
            <Row>
                <Col>
                    <ul
                        className="list-group pe-0 mb-1 overflow-y-auto"
                        style={{ maxHeight: '60vh' }}
                    >
                        {props.listEntryBuilderList.map((builder) =>
                            builder(props.columnTypeCreateFormProps)
                        )}
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
    columnSelectionEntry: ColumnSelectionEntry
    path: number[]
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
    toggleExpansionCallback: (path: number[]) => void
    level: number
}): (columnTypeCreateFormProps?: ColumnTypeCreateFormProps) => ReactNode {
    return (columnTypeCreateFormProps?: ColumnTypeCreateFormProps) => {
        const { columnDefinition, isLoading, children, isExpanded } =
            props.columnSelectionEntry

        let tailElement = undefined
        let expandCallback = undefined
        if (
            columnDefinition.columnType == ColumnType.Inner &&
            props.columnSelectionEntry.isExpandable()
        ) {
            expandCallback = () => props.toggleExpansionCallback(props.path)
        }
        if (columnTypeCreateFormProps !== undefined) {
            tailElement = (
                <Form.Check
                    type="radio"
                    name="parent"
                    value={columnDefinition.idPersistent}
                    onChange={columnTypeCreateFormProps.handleChange}
                    checked={
                        columnTypeCreateFormProps.selectedParent ==
                        columnDefinition.idPersistent
                    }
                />
            )
        } else {
            const isDisplayedInTable = props.columnIndices.has(
                columnDefinition.idPersistent
            )
            if (isDisplayedInTable) {
                tailElement = (
                    <span className="icon">
                        <EyeFill height={20} />
                    </span>
                )
            } else {
                tailElement = (
                    <span
                        className="icon"
                        onClick={() => props.loadColumnDataCallback(columnDefinition)}
                    >
                        <Eye height={20} />
                    </span>
                )
            }
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
                        </Col>
                    </div>
                </Col>
                {tailElement}
            </li>
        )
    }
}

export function mkListItems(args: {
    columnSelectionEntries: ColumnSelectionEntry[]
    path: number[]
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
    toggleExpansionCallback: (path: number[]) => void
    level: number
}): ((columnTypeCreateFormProps?: ColumnTypeCreateFormProps) => ReactNode)[] {
    const {
        columnSelectionEntries,
        path,
        columnIndices,
        loadColumnDataCallback,
        toggleExpansionCallback,
        level
    } = args
    if (level == -1) {
        const item = mkColumnExplorerItem({
            columnSelectionEntry: new ColumnSelectionEntry({
                columnDefinition: new ColumnDefinition({
                    namePath: ['No parent'],
                    idPersistent: '',
                    columnType: ColumnType.Inner,
                    version: 0
                })
            }),
            path: [0],
            columnIndices: columnIndices,
            loadColumnDataCallback: loadColumnDataCallback,
            toggleExpansionCallback: toggleExpansionCallback,
            level: 0
        })
        return [item, ...mkListItems({ ...args, level: 1 })]
    }
    return columnSelectionEntries.flatMap(
        (entry: ColumnSelectionEntry, idx: number) => {
            const newPath = [...path, idx]
            const item = mkColumnExplorerItem({
                columnSelectionEntry: entry,
                path: newPath,
                columnIndices: columnIndices,
                loadColumnDataCallback: loadColumnDataCallback,
                toggleExpansionCallback: toggleExpansionCallback,
                level: level
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
        }
    )
}
