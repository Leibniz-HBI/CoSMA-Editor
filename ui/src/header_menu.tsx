import { ColumnHeaderMenuItem } from './table/hooks'

type HeaderMenuProps = {
    menuEntries: ColumnHeaderMenuItem[]
    closeHeaderMenuCallback: () => void
}
export function HeaderMenu(props: HeaderMenuProps) {
    return (
        <div className="container bg-light rounded" style={{ width: 220 }}>
            <div className="col">
                <div className="row mb-2">
                    <div className="col-9" />
                    <button
                        className="btn-close"
                        onClick={props.closeHeaderMenuCallback}
                        role="button"
                    />
                </div>
                <ul className="list-group">
                    {props.menuEntries.map((entry, idx) => (
                        <li
                            className="list-group-item cursor-pointer"
                            role="button"
                            key={`header-menu-item-${idx}`}
                            onClick={() => {
                                entry.onClick()
                                props.closeHeaderMenuCallback()
                            }}
                        >
                            <div className={entry.labelClassName}>{entry.label}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
