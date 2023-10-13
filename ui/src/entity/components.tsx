import { ChangeEvent, useRef, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { FormField } from '../util/form'
import { RemoteTriggerButton } from '../util/components/misc'
import { Remote } from '../util/state'
import { ErrorPopover } from '../util/error/components'

export function AddEntityForm({
    state,
    addEntityCallback,
    clearErrorCallback
}: {
    state: Remote<boolean>
    addEntityCallback: (displayTxt: string) => void
    clearErrorCallback: VoidFunction
}) {
    const containerRef = useRef(null)
    const buttonRef = useRef(null)
    const [entityDisplayTxt, setEntityDisplayTxt] = useState('')
    return (
        <Col ref={containerRef}>
            <FormField
                name="new-entity-display-txt"
                label="Entity Display Text"
                value={entityDisplayTxt}
                handleChange={(e: ChangeEvent) =>
                    setEntityDisplayTxt((e.target as HTMLInputElement).value)
                }
            />
            <Row className="justify-content-end">
                <Col xs="auto" ref={buttonRef}>
                    <RemoteTriggerButton
                        normalLabel="Add Entity"
                        successLabel="Entity Added"
                        onClick={() => addEntityCallback(entityDisplayTxt)}
                        remoteState={state}
                    />
                </Col>
                <ErrorPopover
                    show={state.errorMsg !== undefined}
                    errorState={{ msg: state.errorMsg ?? '' }}
                    clearError={clearErrorCallback}
                    placement="top"
                    targetRef={buttonRef}
                    containerRef={containerRef}
                ></ErrorPopover>
            </Row>
        </Col>
    )
}
