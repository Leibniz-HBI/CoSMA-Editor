import * as yup from 'yup'
import { Formik } from 'formik'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { useAppDispatch } from '../../hooks'
import { FormField } from '../../util/form'
import { setPasswordThunk } from '../thunks'
const passwordHint =
    'Passwords require at least 8 characters. They have to include ' +
    'a lower case letter, an upper case letter and a number.'
const passwordSchema = yup.object({
    oldPassword: yup.string().required(),
    newPassword: yup
        .string()
        .required()
        .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[.,<>?!@#$%^&*/\\|'"´`~^§\-_[\](){}])(?=.{8,})/,
            'Insecure password'
        ),
    repeatPassword: yup
        .string()
        .oneOf([yup.ref('newPassword')], 'The password fields have to be the same.')
        .required()
})
export function ProfilePasswordComponent({
    onSuccess = undefined
}: {
    onSuccess?: VoidFunction
}) {
    const dispatch = useAppDispatch()
    return (
        <Formik
            initialValues={{ oldPassword: '', newPassword: '', repeatPassword: '' }}
            validationSchema={passwordSchema}
            onSubmit={(values) => {
                dispatch(
                    setPasswordThunk(values.oldPassword, values.newPassword, onSuccess)
                )
            }}
        >
            {({ values, errors, touched, handleChange, handleSubmit }) => {
                const passwordHintClass =
                    touched.newPassword && errors.newPassword ? 'text-danger' : ''
                return (
                    <Form noValidate onSubmit={handleSubmit} className="has-validation">
                        <FormField
                            name="oldPassword"
                            label="Old Password"
                            value={values.oldPassword}
                            error={errors.oldPassword}
                            isTouched={touched.oldPassword}
                            handleChange={handleChange}
                            type="password"
                        />
                        <FormField
                            name="newPassword"
                            label="New Password"
                            value={values.newPassword}
                            error={errors.newPassword}
                            isTouched={touched.newPassword}
                            handleChange={handleChange}
                            type="password"
                        />
                        <FormField
                            name="repeatPassword"
                            label="Repeat Password"
                            value={values.repeatPassword}
                            error={errors.repeatPassword}
                            isTouched={touched.repeatPassword}
                            handleChange={handleChange}
                            type="password"
                        />
                        <Row>
                            <Col>
                                <span className={passwordHintClass}>
                                    {passwordHint}
                                </span>
                            </Col>
                            <Col xs="auto">
                                <Button type="submit">Submit</Button>
                            </Col>
                        </Row>
                    </Form>
                )
            }}
        </Formik>
    )
}
