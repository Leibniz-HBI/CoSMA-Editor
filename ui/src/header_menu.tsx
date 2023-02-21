type HeaderMenuProps = {
    removeColumnCallback: () => void
    closeHeaderMenuCallback: () => void
}
export function HeaderMenu(props: HeaderMenuProps) {
    return (
        <div className="container bg-light rounded" style={{ width: 160 }}>
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
                    <li
                        className="list-group-item cursor-pointer"
                        role="button"
                        onClick={() => {
                            props.removeColumnCallback()
                            props.closeHeaderMenuCallback()
                        }}
                    >
                        <div className="danger text-danger">Hide Column</div>
                    </li>
                </ul>
            </div>
        </div>
    )
}
