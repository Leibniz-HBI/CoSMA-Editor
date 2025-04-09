import * as yup from 'yup'
import { useAppDispatch } from '../../hooks'
import { Formik } from 'formik'
import { setPasswordThunk } from './thunks'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import { UserSearch } from '../../user/permission_groups/components'
import { useUserInfo } from '../../user/hooks'

const passwordHint =
    'Passwords require at least 8 characters. They have to include ' +
    'a lower case letter, an upper case letter and a number.'
const passwordSchema = yup.object({
    idUserPersistent: yup.string().required(),
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
export function ManagementPasswordComponent() {
    const dispatch = useAppDispatch()
    return (
        <Formik
            initialValues={{
                idUserPersistent: '',
                newPassword: '',
                repeatPassword: ''
            }}
            validationSchema={passwordSchema}
            onSubmit={(values) => {
                dispatch(setPasswordThunk(values.idUserPersistent, values.newPassword))
            }}
        >
            {({ values, errors, touched, handleChange, setValues, handleSubmit }) => {
                const selectedUser = useUserInfo(values.idUserPersistent)
                const passwordHintClass =
                    touched.newPassword && errors.newPassword ? 'text-danger' : ''
                return (
                    <Form noValidate onSubmit={handleSubmit} className="has-validation">
                        <UserSearch
                            onSearchResultClicked={(idUserPersistent) =>
                                setValues({ ...values, idUserPersistent })
                            }
                        />
                        <Row className="mb-4">
                            <Col xs="auto">Selected user:</Col>
                            <Col>
                                <strong>{selectedUser.value?.username}</strong>
                            </Col>
                        </Row>
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
