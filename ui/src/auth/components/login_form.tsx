import * as yup from 'yup'
import { Formik } from 'formik'
import { FormEvent } from 'react'
import { HandleChange } from '../../util/type'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'

type LoginFormArgs = { userName: string; password: string }

const loginSchema = yup.object({
    userName: yup.string().required(),
    password: yup.string().required()
})

export type LoginCallback = (userName: string, password: string) => void

export function LoginForm({ loginCallback }: { loginCallback: LoginCallback }) {
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
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                />
            )}
        </Formik>
    )
}

export function LoginFormBody(props: {
    values: LoginFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
}) {
    const { handleSubmit, handleChange, values } = props
    return (
        <Form noValidate onSubmit={handleSubmit}>
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
                    <Button type="submit">Login</Button>
                </Col>
            </Row>
        </Form>
    )
}
