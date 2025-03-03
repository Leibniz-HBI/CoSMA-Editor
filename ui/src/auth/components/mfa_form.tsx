import { Button, Col, Row } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectTotpUrl } from '../selectors'
import {
    postActivateTotpThunk,
    postTotpAuthenticationThunk
} from '../thunks'
import { FormField } from '../../util/form'
import { ChangeEvent, useState } from 'react'

export function MfaForm() {
    const [code, setCode] = useState('')
    const dispatch = useAppDispatch()
    const totpUrl = useAppSelector(selectTotpUrl)
    let qrCode = (
        <Col>
            <Row>Please enter the current code from your authenticator app.</Row>
        </Col>
    )
    let action = (code: string) => dispatch(postTotpAuthenticationThunk(code))
    if (totpUrl.value !== undefined) {
        qrCode = (
            <Col>
                <Row>Please register an authenticator app using the QR-Code</Row>
                <Row>
                    <img src={totpUrl.value} />
                </Row>
            </Col>
        )
        action = (code) => dispatch(postActivateTotpThunk(code))
    }
    return (
        <Col>
            <Row>{qrCode}</Row>
            <Row>
                <FormField
                    name="mfa-Code"
                    label="Authenticator Code"
                    value={code}
                    handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCode(e.target.value)
                    }
                />
            </Row>
            <Row>
                <Button onClick={() => action(code)}>Submit</Button>
            </Row>
        </Col>
    )
}

export function RegisterMfaForm() {
    return <div></div>
}

export function ActivateMfaForm() {
    return <div></div>
}
