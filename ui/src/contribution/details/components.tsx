import * as yup from 'yup'
import { FormEvent, useState } from 'react'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { HandleChange } from '../../util/type'
import { Button, Col, Form, Modal, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { Contribution } from '../state'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectContribution } from '../selectors'
import { patchContributionDetails } from '../thunks'
import { StepperLoaderData } from '../components'
import { addSuccessVanish } from '../../util/notification/slice'

export type PatchContributionCallback = ({
    name,
    description,
    emptyValues,
    hasHeader
}: {
    name?: string
    description?: string
    emptyValues?: string
    hasHeader?: boolean
}) => void

export function ContributionDetailsStep() {
    const idPersistent =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useLoaderData<StepperLoaderData<any>>().idContributionPersistent
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const contribution = useAppSelector(selectContribution)
    if (contribution.isLoading || contribution.value == undefined) {
        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <div className="shimmer"></div>
                </div>
            </div>
        )
    }
    return (
        <EditForm
            contribution={contribution.value}
            onSubmit={({ name, description, hasHeader, emptyValues }) => {
                dispatch(
                    patchContributionDetails({
                        idPersistent,
                        name,
                        description,
                        emptyValues,
                        hasHeader
                    })
                ).then((success) => {
                    if (success) {
                        dispatch(
                            addSuccessVanish(
                                'Contribution details updated successfully.'
                            )
                        )
                        navigate(`/contribute/${idPersistent}/columns`)
                    }
                })
            }}
        />
    )
}

export type EditFormArgs = {
    name: string
    description: string
    emptyValues: string
    hasHeader: boolean
}
const editSchema = yup.object({
    name: yup.string().defined().min(8),
    description: yup.string(),
    emptyValues: yup.string(),
    hasHeader: yup.boolean()
})

export function EditForm({
    contribution,
    onSubmit
}: {
    contribution: Contribution
    onSubmit: PatchContributionCallback
}) {
    if (contribution.markedForDeletion) {
        return <DeletedContribution />
    }
    return (
        <Formik
            onSubmit={(values) => {
                onSubmit({
                    name: values.name,
                    description: values.description,
                    hasHeader: values.hasHeader,
                    emptyValues: values.emptyValues
                })
            }}
            initialValues={{
                name: contribution.name,
                description: contribution.description,
                hasHeader: contribution.hasHeader,
                emptyValues: contribution.emptyValues
            }}
            validationSchema={editSchema}
        >
            {({ values, handleSubmit, handleChange, errors, touched }) => (
                <EditFormBody
                    idContributionPersistent={contribution.idPersistent}
                    values={values}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    touched={touched}
                    formErrors={errors}
                />
            )}
        </Formik>
    )
}

export function EditFormBody({
    idContributionPersistent,
    values,
    handleSubmit,
    handleChange,
    formErrors,
    touched
}: {
    idContributionPersistent: string
    values: EditFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    touched: FormikTouched<EditFormArgs>
    formErrors: FormikErrors<EditFormArgs>
}) {
    const [showModal, setShowModal] = useState(false)
    return (
        <>
            <Form noValidate onSubmit={handleSubmit}>
                <Row>
                    <Col>
                        <FormField
                            name="name"
                            handleChange={handleChange}
                            type="text"
                            value={values.name}
                            label="name"
                            error={formErrors.name}
                            isTouched={touched.name}
                            role="textbox"
                        />
                        <Form.Check
                            className="mb-4"
                            name="hasHeader"
                            label="File has header row"
                            checked={values.hasHeader}
                            onChange={handleChange}
                        />
                        <FormField
                            name="emptyValues"
                            handleChange={handleChange}
                            type="text"
                            value={values.emptyValues}
                            label="EmptyValues"
                            error={formErrors.emptyValues}
                            isTouched={touched.emptyValues}
                            role="textbox"
                        />
                    </Col>
                    <Col>
                        <FormField
                            className="min-h-200px"
                            name="description"
                            handleChange={handleChange}
                            type="text"
                            value={values.description}
                            label="description"
                            error={formErrors.description}
                            isTouched={touched.description}
                            as="textarea"
                            role="textbox"
                        />
                    </Col>
                </Row>
                <Row className="justify-content-end">
                    <Col sm="auto" variant="outline-danger">
                        <Button
                            variant="outline-danger"
                            onClick={() => setShowModal(true)}
                        >
                            Delete
                        </Button>
                    </Col>
                    <Col sm="auto">
                        <Button type="submit">Edit</Button>
                    </Col>
                </Row>
            </Form>
            <DeleteModal
                show={showModal}
                idContributionPersistent={idContributionPersistent}
                closeCallback={() => setShowModal(false)}
            />
        </>
    )
}

function DeleteModal({
    show,
    idContributionPersistent,
    closeCallback
}: {
    show: boolean
    idContributionPersistent: string
    closeCallback: () => void
}) {
    const dispatch = useAppDispatch()
    return (
        <Modal show={show} onHide={() => closeCallback}>
            <Modal.Header>Delete Contribution</Modal.Header>
            <Modal.Body>
                <Col>
                    <Row className="mb-4">
                        <Col>Are you sure you want to delete this contribution?</Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <Button
                                variant="outline-danger"
                                onClick={() =>
                                    dispatch(
                                        patchContributionDetails({
                                            idPersistent: idContributionPersistent,
                                            markForDeletion: true
                                        })
                                    ).then((success) => {
                                        if (success) {
                                            dispatch(
                                                addSuccessVanish(
                                                    'Contribution deleted successfully.'
                                                )
                                            )
                                            closeCallback()
                                        }
                                    })
                                }
                            >
                                Confirm Deletion
                            </Button>
                        </Col>
                        <Col xs="auto">
                            <Button variant="primary" onClick={closeCallback}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </Col>
            </Modal.Body>
        </Modal>
    )
}

function DeletedContribution() {
    const navigate = useNavigate()
    return (
        <Col className="justify-content-center align-items-center text-center">
            <Row className="justify-content-center mb-5">This contribution was marked for deletion</Row>
            <Row className="justify-content-center">
                <Col xs="auto" className="justify-content-center">
                    <Button variant="primary" onClick={() => navigate('/contribute')}>
                        Go to Contribution List
                    </Button>
                </Col>
            </Row>
        </Col>
    )
}
