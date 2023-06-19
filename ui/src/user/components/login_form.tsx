import * as yup from 'yup'
import { ErrorPopover, ErrorState } from '../../util/error'
import { LoginCallback } from '../hooks'
import { Formik } from 'formik'
import { FormEvent, useRef } from 'react'
import { HandleChange } from '../../util/type'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'

type LoginFormArgs = { userName: string; password: string }

const loginSchema = yup.object({
    userName: yup.string().required(),
    password: yup.string().required()
})

export function LoginForm({
    loginError,
    clearLoginErrorCallback,
    loginCallback,
    openRegistrationCallback
}: {
    loginError?: ErrorState
    clearLoginErrorCallback: VoidFunction
    loginCallback: LoginCallback
    openRegistrationCallback: VoidFunction
}) {
    return (
        <Formik
            validationSchema={loginSchema}
            initialValues={{ userName: '', password: '' }}
            onSubmit={(values: LoginFormArgs) =>
                loginCallback(values.userName, values.password)
            }
        >
            {({ handleSubmit, handleChange, values }) => (
                <LoginFormBody
                    values={values}
                    loginError={loginError}
                    clearLoginErrorCallback={clearLoginErrorCallback}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    openRegistrationCallback={openRegistrationCallback}
                />
            )}
        </Formik>
    )
}

export function LoginFormBody(props: {
    values: LoginFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    loginError?: ErrorState
    clearLoginErrorCallback: VoidFunction
    openRegistrationCallback: VoidFunction
}) {
    const {
        handleSubmit,
        handleChange,
        values,
        loginError,
        openRegistrationCallback,
        clearLoginErrorCallback
    } = props
    const containerRef = useRef(null)
    const buttonRef = useRef(null)
    return (
        <Form noValidate onSubmit={handleSubmit} ref={containerRef}>
            <FormField
                name="userName"
                label="Username"
                value={values.userName}
                handleChange={handleChange}
            />
            <FormField
                name="password"
                type="password"
                label="Password"
                value={values.password}
                handleChange={handleChange}
            />
            <Row className="justify-content-end mt-4">
                <Col></Col>
                <Col sm="auto">
                    <Button
                        variant="outline-primary"
                        onClick={openRegistrationCallback}
                    >
                        Registration
                    </Button>
                </Col>
                <Col sm="auto">
                    <Button type="submit" ref={buttonRef}>
                        Login
                    </Button>
                    {!!loginError && (
                        <ErrorPopover
                            errorState={loginError}
                            placement="top"
                            clearError={clearLoginErrorCallback}
                            targetRef={buttonRef}
                            containerRef={containerRef}
                        />
                    )}
                </Col>
            </Row>
        </Form>
    )
}
