import { MutableRefObject } from 'react'
import {
    CloseButton,
    Col,
    Overlay,
    Popover,
    Row,
    Toast,
    ToastContainer
} from 'react-bootstrap'
import { Placement } from 'react-bootstrap/esm/types'
import { ErrorState, removeError, errorListSelector } from './slice'
import { useDispatch, useSelector } from 'react-redux'
import { MouseEvent } from 'react'
/**
 * Component for showing an error message and a retry button.
 * @param props
 * @returns
 */
export function ErrorContainer(props: { errorState: ErrorState }) {
    const { msg } = props.errorState
    return (
        <div className="column bg-danger-subtle">
            <div>{msg}</div>
        </div>
    )
}

export function ErrorPopover({
    errorState,
    placement,
    clearError,
    show = true,
    targetRef,
    containerRef
}: {
    errorState: { msg: string }
    placement: Placement
    clearError: ((event: MouseEvent<HTMLElement>) => void) | VoidFunction
    show?: boolean
    targetRef: MutableRefObject<null>
    containerRef?: MutableRefObject<null>
}) {
    return (
        <Overlay
            show={show}
            target={targetRef}
            container={containerRef}
            placement={placement}
        >
            <Popover id="submit-column-definition-error-popover">
                <Popover.Header className="bg-danger text-light">
                    <Row className="justify-content-between">
                        <Col>Error</Col>
                        <CloseButton variant="white" onClick={clearError}></CloseButton>
                    </Row>
                </Popover.Header>
                <Popover.Body>
                    <Row>{errorState.msg}</Row>
                </Popover.Body>
            </Popover>
        </Overlay>
    )
}

export function ErrorToasts() {
    const errors = useSelector(errorListSelector)
    const dispatch = useDispatch()
    return (
        <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1 }}>
            {errors.map((error) => (
                <Toast onClose={() => dispatch(removeError(error.id))} key={error.id}>
                    <Toast.Header
                        closeButton={true}
                        closeVariant="white"
                        className="bg-danger"
                    ></Toast.Header>
                    <Toast.Body>{error.msg}</Toast.Body>
                </Toast>
            ))}
        </ToastContainer>
    )
}
