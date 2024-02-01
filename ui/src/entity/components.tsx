import { ChangeEvent, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { FormField } from '../util/form'
import { RemoteTriggerButton } from '../util/components/misc'
import { Remote } from '../util/state'

export function AddEntityForm({
    state,
    addEntityCallback
}: {
    state: Remote<boolean>
    addEntityCallback: (displayTxt: string) => void
}) {
    const [entityDisplayTxt, setEntityDisplayTxt] = useState('')
    return (
        <Col>
            <FormField
                name="new-entity-display-txt"
                label="Entity Display Text"
                value={entityDisplayTxt}
                handleChange={(e: ChangeEvent) =>
                    setEntityDisplayTxt((e.target as HTMLInputElement).value)
                }
            />
            <Row className="justify-content-end">
                <Col xs="auto">
                    <RemoteTriggerButton
                        label="Add Entity"
                        onClick={() => addEntityCallback(entityDisplayTxt)}
                        isLoading={state.isLoading}
                    />
                </Col>
            </Row>
        </Col>
    )
}
