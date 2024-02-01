import * as yup from 'yup'
import { RegistrationCallback } from '../hooks'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { FormEvent } from 'react'
import { HandleChange } from '../../util/type'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'

type RegistrationFormArgs = {
    userName: string
    email: string
    namesPersonal: string
    namesFamily: string
    password: string
    passwordRepeat: string
}

const passwordHint =
    'Passwords require at least 8 characters. They have to include ' +
    'a lower case letter, an upper case letter and a number.'
const registrationSchema = yup.object({
    userName: yup.string().required().trim(),
    email: yup.string().required().email().trim(),
    namesPersonal: yup.string().required().trim(),
    namesFamily: yup.string().notRequired().trim(),
    password: yup
        .string()
        .required()
        .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[.,<>?!@#$%^&*/\\|'"´`~^§\-_[\](){}])(?=.{8,})/,
            'Insecure password'
        ),
    passwordRepeat: yup
        .string()
        .oneOf([yup.ref('password')], 'The password fields have to be the same.')
        .required()
})

export function RegistrationForm({
    registrationCallback,
    closeRegistrationCallback
}: {
    registrationCallback: RegistrationCallback
    closeRegistrationCallback: VoidFunction
}) {
    return (
        <Formik
            validationSchema={registrationSchema}
            initialValues={{
                userName: '',
                email: '',
                namesPersonal: '',
                namesFamily: '',
                password: '',
                passwordRepeat: ''
            }}
            onSubmit={(values: RegistrationFormArgs) =>
                registrationCallback({
                    userName: values.userName,
                    email: values.email,
                    namesPersonal: values.namesPersonal,
                    namesFamily: values.namesFamily,
                    password: values.password
                })
            }
        >
            {({ handleSubmit, handleChange, touched, errors, values }) => (
                <RegistrationFormBody
                    values={values}
                    formErrors={errors}
                    touched={touched}
                    handleSubmit={handleSubmit}
                    handleChange={handleChange}
                    closeRegistrationCallback={closeRegistrationCallback}
                />
            )}
        </Formik>
    )
}

export function RegistrationFormBody({
    values,
    handleSubmit,
    handleChange,
    touched,
    formErrors,
    closeRegistrationCallback
}: {
    values: RegistrationFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    formErrors: FormikErrors<RegistrationFormArgs>
    touched: FormikTouched<RegistrationFormArgs>
    closeRegistrationCallback: VoidFunction
}) {
    const passwordHintClass =
        touched.password && formErrors.password ? 'text-danger' : ''
    return (
        <Form noValidate onSubmit={handleSubmit} className="has-validation">
            <FormField
                name="userName"
                label="Username"
                value={values.userName}
                isTouched={touched.userName}
                error={formErrors.userName}
                handleChange={handleChange}
            />
            <FormField
                name="email"
                label="Email"
                value={values.email}
                isTouched={touched.email}
                error={formErrors.email}
                handleChange={handleChange}
            />
            <FormField
                name="namesPersonal"
                label="Personal name(s)"
                value={values.namesPersonal}
                isTouched={touched.namesPersonal}
                error={formErrors.namesPersonal}
                handleChange={handleChange}
            />
            <FormField
                name="namesFamily"
                label="Family name(s)"
                value={values.namesFamily}
                isTouched={touched.namesFamily}
                error={formErrors.namesFamily}
                handleChange={handleChange}
            />
            <FormField
                name="password"
                type="password"
                label="Password"
                value={values.password}
                isTouched={touched.password}
                error={formErrors.password}
                handleChange={handleChange}
            />
            <FormField
                name="passwordRepeat"
                type="password"
                label="Repeat password"
                value={values.passwordRepeat}
                isTouched={touched.passwordRepeat}
                error={formErrors.passwordRepeat}
                handleChange={handleChange}
            />
            <Row className="justify-content-end mt-4">
                <Col>
                    <span className={passwordHintClass}>{passwordHint}</span>
                </Col>
                <Col sm="auto" className="align-self-center">
                    <Button
                        variant="outline-primary"
                        onClick={closeRegistrationCallback}
                    >
                        Login
                    </Button>
                </Col>
                <Col sm="auto" className="align-self-center">
                    <Button variant="primary" type="submit">
                        Register
                    </Button>
                </Col>
            </Row>
        </Form>
    )
}
