import * as yup from 'yup'
import { useAppDispatch } from '../../hooks'
import { Formik } from 'formik'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { UserSearch } from '../permission_groups/components'
import { useUserInfo } from '../../user/hooks'
import { delete2FAThunk } from './thunks'

const passwordSchema = yup.object({
    idUserPersistent: yup.string().required()
})
export function Reset2faComponent() {
    const dispatch = useAppDispatch()
    return (
        <Formik
            initialValues={{
                idUserPersistent: ''
            }}
            validationSchema={passwordSchema}
            onSubmit={(values) => {
                dispatch(delete2FAThunk(values.idUserPersistent))
            }}
        >
            {({ values, setValues, handleSubmit }) => {
                const selectedUser = useUserInfo(values.idUserPersistent)
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
                        <Row>
                            <Col></Col>
                            <Col xs="auto">
                                <Button type="submit">Remove 2FA</Button>
                            </Col>
                        </Row>
                    </Form>
                )
            }}
        </Formik>
    )
}
