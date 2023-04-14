import { MutableRefObject } from 'react'
import { Button, CloseButton, Col, Overlay, Popover, Row } from 'react-bootstrap'
import { ArrowClockwise } from 'react-bootstrap-icons'
import { Placement } from 'react-bootstrap/esm/types'

export class ErrorState {
    msg: string
    retryCallback?: VoidFunction

    constructor(msg: string, retryCallback?: VoidFunction) {
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

export function ErrorPopover(props: {
    errorState: ErrorState
    placement: Placement
    clearError: VoidFunction
    targetRef: MutableRefObject<null>
    containerRef?: MutableRefObject<null>
}) {
    return (
        <Overlay
            show={true}
            target={props.targetRef}
            container={props.containerRef}
            placement={props.placement}
        >
            <Popover id="submit-column-definition-error-popover">
                <Popover.Header className="bg-danger text-light">
                    <Row className="justify-content-between">
                        <Col>Error</Col>
                        <CloseButton
                            variant="white"
                            onClick={props.clearError}
                        ></CloseButton>
                    </Row>
                </Popover.Header>
                <Popover.Body>
                    <Row>{props.errorState?.msg}</Row>
                    {!!props.errorState?.retryCallback && (
                        <div className="d-flex justify-content-end">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={props.errorState?.retryCallback}
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                </Popover.Body>
            </Popover>
        </Overlay>
    )
}
