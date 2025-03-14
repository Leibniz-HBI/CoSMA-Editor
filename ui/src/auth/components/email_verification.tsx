import { useLoaderData, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectEmailVerification } from '../selectors'
import { useEffect } from 'react'
import { CosmaeLoading } from '../../util/components/misc'
import { Button, Col, Modal, Row } from 'react-bootstrap'
import { logoutThunk, postEmailVerificationThunk } from '../thunks'

export function EmailVerification() {
    const key = useLoaderData()
    const emailVerification = useAppSelector(selectEmailVerification)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    useEffect(() => {
        if (emailVerification.isLoading) {
            return
        }
        if (emailVerification.value === undefined) {
            dispatch(postEmailVerificationThunk(key))
        } else {
            navigate('/')
        }
    })
    let modalContent = <CosmaeLoading />
    if (emailVerification.value == false) {
        modalContent = (
            <span>
                <span>Could not verify your email address. </span>
                <span>Please see the error message.</span>
            </span>
        )
    }
    return (
        <div className="modal show" style={{ display: 'block', position: 'initial' }}>
            <Modal.Dialog>
                <Modal.Body>{modalContent}</Modal.Body>
            </Modal.Dialog>
        </div>
    )
}

export function EmailVerificationNeeded() {
    const dispatch = useAppDispatch()
    return (
        <Col>
            <Row className="justify-content-center mb-4">
                <span>
                    <span>Please verify your email address. </span>
                    <span>A confirmation link has been send to you.</span>
                    <span> Another link will be sent the next time you login.</span>
                </span>
            </Row>
            <Row className="justify-content-center">
                <Col xs="auto">
                    <Button onClick={() => dispatch(logoutThunk())}>Logout</Button>
                </Col>
            </Row>
        </Col>
    )
}
