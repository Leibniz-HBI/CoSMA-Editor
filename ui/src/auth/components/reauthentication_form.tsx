import { useAppDispatch } from '../../hooks'
import { ChangeEvent, useState } from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import { reauthenticateThunk } from '../thunks'

export function ReauthenticationForm() {
    const [password, setPassword] = useState('')
    const dispatch = useAppDispatch()

    return (
        <Form>
            <Col>
                <Row>Please renter your password</Row>
                <Row>
                    <FormField
                        label="Password"
                        name="password"
                        type="password"
                        value={password}
                        handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setPassword(e.target.value)
                        }
                    />
                </Row>
                <Row>
                    <Col xs="auto">
                        <Button
                            onClick={() => {
                                dispatch(reauthenticateThunk(password))
                            }}
                        >
                            Submit
                        </Button>
                    </Col>
                </Row>
            </Col>
        </Form>
    )
}
