import { Button, Col, Form, Row } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectTotpUrl } from '../selectors'
import {
    postActivateTotpThunk,
    postReauthenticateMfaThunk,
    postTotpAuthenticationThunk
} from '../thunks'
import { FormField } from '../../util/form'
import { ChangeEvent } from 'react'
import { Formik } from 'formik'

export function MfaForm({ reauthenticate }: { reauthenticate: boolean }) {
    const dispatch = useAppDispatch()
    const totpUrl = useAppSelector(selectTotpUrl)
    let qrCode = (
        <Col>
            <Row>Please enter the current code from your authenticator app.</Row>
        </Col>
    )
    let action = postTotpAuthenticationThunk
    if (totpUrl.value !== undefined) {
        qrCode = (
            <Col>
                <Row>Please register an authenticator app using the QR-Code</Row>
                <Row>
                    <img src={totpUrl.value} />
                </Row>
            </Col>
        )
        action = postActivateTotpThunk
    } else if (reauthenticate) {
        action = postReauthenticateMfaThunk
        qrCode = (
            <Col>
                <Row>
                    Please reauthenticate using the current code from your authenticator
                    app.
                </Row>
            </Col>
        )
    }
    return (
        <Formik
            initialValues={{ code: '' }}
            onSubmit={(values) => dispatch(action(values.code))}
        >
            {({ setValues, values, handleSubmit }) => (
                <Form noValidate onSubmit={handleSubmit}>
                    <Col>
                        <Row>{qrCode}</Row>
                        <Row>
                            <FormField
                                name="mfa-Code"
                                label="Authenticator Code"
                                value={values.code}
                                handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setValues({ code: e.target.value })
                                }}
                            />
                        </Row>
                        <Row>
                            <Button type="submit">Submit</Button>
                        </Row>
                    </Col>
                </Form>
            )}
        </Formik>
    )
}
