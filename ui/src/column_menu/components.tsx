import { useColumnMenu } from './hooks'
import { ColumnDefinition } from './state'
type ColumnMenuProps = {
    addColumnCallback: (columnDefintion: ColumnDefinition) => void
}

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

export function ColumnMenu(props: ColumnMenuProps) {
    const columnDefs = useColumnMenu()
    return (
        <div className="cosmae-column-menu-container">
            {columnDefs.map((colDef: ColumnDefinition) => (
                <div
                    className="cosmae-column-menu-item"
                    onClick={() => {
                        props.addColumnCallback(colDef)
                    }}
                    key={colDef.idPersistent}
                >
                    {constructColumnTitle(colDef.namePath)}
                </div>
            ))}
        </div>
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
