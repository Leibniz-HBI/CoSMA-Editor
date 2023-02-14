type HeaderMenuProps = {
    removeColumnCallback: () => void
    closeHeaderMenuCallback: () => void
}
export function HeaderMenu(props: HeaderMenuProps) {
    return (
        <div className="cosmae-header-menu-container">
            <div className="cosmae-header-menu-close-row">
                <div onClick={props.closeHeaderMenuCallback}>✖</div>
            </div>
            <div
                className="cosmae-header-menu-item"
                onClick={() => {
                    props.removeColumnCallback()
                    props.closeHeaderMenuCallback()
                }}
            >
                <div className="danger">Hide Column</div>
            </div>
        </div>
    )
}
