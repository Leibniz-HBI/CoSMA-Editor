import { ArrowClockwise } from 'react-bootstrap-icons'

export class ErrorState {
    msg: string
    retryCallback?: VoidFunction

    constructor({
        msg,
        retryCallback = undefined
    }: {
        msg: string
        retryCallback?: VoidFunction
    }) {
        this.msg = msg
        this.retryCallback = retryCallback
    }
}

/**
 * Component for showing an error message and a retry button.
 * @param props
 * @returns
 */
export function ErrorContainer(props: { errorState: ErrorState }) {
    const { msg, retryCallback } = props.errorState
    if (retryCallback === undefined) {
        return (
            <div className="column bg-danger-subtle">
                <div>{msg}</div>
            </div>
        )
    }
    return (
        <div className="column bg-danger-subtle">
            <ArrowClockwise onClick={retryCallback} />
            <div>{msg}</div>
        </div>
    )
}
