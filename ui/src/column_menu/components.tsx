import { ReactNode } from 'react'
import { Form, FormLabel } from 'react-bootstrap'
import { DashLg, Eye, EyeFill, PlusLg } from 'react-bootstrap-icons'
import { useRemoteColumnMenuData } from './hooks'
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from './state'

export function constructColumnTitle(namePath: string[]): string {
    if (namePath === undefined || namePath.length == 0) {
        return 'UNKNOWN'
    }
    if (namePath.length > 3) {
        return `${namePath[0]} -> ... -> ${namePath[namePath.length - 2]} -> ${
            namePath[namePath.length - 1]
        }`
    }
    return namePath.join(' -> ')
}

export function ColumnMenu(props: {
    baseUrl: string
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
}) {
    const { navigationEntries: columnSelectionEntries, toggleExpansionCallback } =
        useRemoteColumnMenuData(props.baseUrl)
    const listEntries = mkListItems({
        columnSelectionEntries: columnSelectionEntries,
        path: [],
        columnIndices: props.columnIndices,
        loadColumnDataCallback: props.loadColumnDataCallback,
        toggleExpansionCallback: toggleExpansionCallback,
        level: 0
    })
    return (
        <div
            className="container text-left bg-light rounded vh-80"
            style={{ width: '400px' }}
        >
            <div className="col">
                <div className="row ms-1 me-1">
                    <Form className="ps-0 pe-0">
                        <FormLabel>
                            <input type="text" name="name" placeholder="Search" />
                        </FormLabel>
                    </Form>
                </div>
                <div className="container ps-0 pe-2 ms-1 me-1 rounded">
                    <ul
                        className="list-group pe-0 mb-1 overflow-y-auto"
                        style={{ maxHeight: '60vh' }}
                    >
                        {listEntries}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export function ColumnExplorerIcon(props: {
    isLoading: boolean
    isExpandable: boolean
    isExpanded: boolean
    isDisplayedInTable: boolean
}) {
    let icon
    if (props.isLoading) {
        icon = <div className="spinner-border spinner-border-sm" role="status"></div>
    } else if (props.isExpandable) {
        if (props.isExpanded) {
            icon = <DashLg height={20} />
        } else {
            icon = <PlusLg height={20} />
        }
    } else {
        if (props.isDisplayedInTable) {
            icon = <EyeFill height={20} />
        } else {
            icon = <Eye height={20} />
        }
    }
    return <span className="icon">{icon}</span>
}
export function ColumnExplorerItem(props: {
    columnSelectionEntry: ColumnSelectionEntry
    path: number[]
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
    toggleExpansionCallback: (path: number[]) => void
    level: number
}) {
    const { columnDefinition, isLoading, children, isExpanded } =
        props.columnSelectionEntry
    let callback = undefined
    const isDisplayedInTable = props.columnIndices.has(columnDefinition.idPersistent)
    if (
        columnDefinition.columnType == ColumnType.Inner &&
        props.columnSelectionEntry.isExpandable()
    ) {
        callback = () => props.toggleExpansionCallback(props.path)
    } else {
        if (!isDisplayedInTable) {
            callback = () => props.loadColumnDataCallback(columnDefinition)
        }
    }
    return (
        <li
            onClick={callback}
            className="list-group-item d-flex flex-row"
            key={`cosmae-tree-menu-item-${columnDefinition.idPersistent}`}
            role="button"
        >
            <div>
                {Array.from({ length: props.level }, (value: number, idx: number) => (
                    <span className="indent" key={`indent-${idx}`} />
                ))}
                <ColumnExplorerIcon
                    isLoading={isLoading}
                    isExpandable={children.length > 0}
                    isExpanded={isExpanded}
                    isDisplayedInTable={isDisplayedInTable}
                />
            </div>
            {constructColumnTitle(columnDefinition.namePath)}
        </li>
    )
}

export function mkListItems(args: {
    columnSelectionEntries: ColumnSelectionEntry[]
    path: number[]
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
    toggleExpansionCallback: (path: number[]) => void
    level: number
}): ReactNode[] {
    const {
        columnSelectionEntries,
        path,
        columnIndices,
        loadColumnDataCallback,
        toggleExpansionCallback,
        level
    } = args
    return columnSelectionEntries.flatMap(
        (entry: ColumnSelectionEntry, idx: number) => {
            const newPath = [...path, idx]
            const item = (
                <ColumnExplorerItem
                    columnSelectionEntry={entry}
                    path={newPath}
                    columnIndices={columnIndices}
                    loadColumnDataCallback={loadColumnDataCallback}
                    toggleExpansionCallback={toggleExpansionCallback}
                    level={level}
                    key={entry.columnDefinition.idPersistent}
                />
            )
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ColumnAddButton(props: any) {
    return (
        <div className="cosmae-column-add-button" onClick={props.onClick}>
            {props.children}
        </div>
    )
}
