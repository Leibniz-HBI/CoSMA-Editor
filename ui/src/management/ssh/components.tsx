import * as yup from 'yup'
import { useAppDispatch } from '../../hooks'
import { Formik } from 'formik'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import { UserSearch } from '../permission_groups/components'
import { useUserInfo } from '../../user/hooks'
import { setSshKeyThunk } from './thunks'

const passwordSchema = yup.object({
    idUserPersistent: yup.string().required(),
    sshKey: yup.string().required()
})
export function ManagementSshKeyComponent() {
    const dispatch = useAppDispatch()
    return (
        <Formik
            initialValues={{
                idUserPersistent: '',
                sshKey: ''
            }}
            validationSchema={passwordSchema}
            onSubmit={(values) => {
                dispatch(setSshKeyThunk(values.idUserPersistent, values.sshKey))
            }}
        >
            {({ values, errors, touched, handleChange, setValues, handleSubmit }) => {
                const selectedUser = useUserInfo(values.idUserPersistent)
                const passwordHintClass =
                    touched.sshKey && errors.sshKey ? 'text-danger' : ''
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
                            name="sshKey"
                            label="User SSH Key"
                            value={values.sshKey}
                            error={errors.sshKey}
                            isTouched={touched.sshKey}
                            handleChange={handleChange}
                        />
                        <Row>
                            <Col>
                                <span className={passwordHintClass}>
                                    {'SSH Key is required.'}
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
