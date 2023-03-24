// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ColumnAddButton(props: any) {
    return (
        <div className="cosmae-column-add-button" onClick={props.onClick}>
            {props.children}
        </div>
    )
}
