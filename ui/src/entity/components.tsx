import { ChangeEventHandler, FormEvent, useEffect } from 'react'
import { Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { FormField } from '../util/form'
import { RemoteSubmitButton } from '../util/components/misc'
import { RemoteInterface } from '../util/state'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import * as yup from 'yup'
import { useAppDispatch, useAppSelector } from '../hooks'
import { getEntityDetailsThunk } from './thunks'
import {
    selectEntityDetails,
    selectShowDetailsForEntityWithIdPersistent
} from './selectors'
import { setShowDetailsForEntityWithIdPersistent } from './slice'
import { useTagDefinition } from '../column_menu/hooks'
import { TagDefinitionNamePath } from '../column_menu/components/misc'
import { Entity } from '../table/state'

const schema = yup.object({
    displayTxt: yup.string().trim(),
    justification: yup.string().required().min(8).trim()
})

interface AddEntityArgs {
    displayTxt: string
    justification: string
}

export function AddEntityForm({
    state,
    addEntityCallback
}: {
    state: RemoteInterface<boolean>
    addEntityCallback: (displayTxt: string | undefined, justification: string) => void
}) {
    return (
        <Formik
            initialValues={{ displayTxt: '', justification: '' }}
            onSubmit={({ displayTxt, justification }) => {
                addEntityCallback(
                    displayTxt == '' ? undefined : displayTxt,
                    justification
                )
            }}
            validationSchema={schema}
        >
            {({ values, errors, handleChange, handleSubmit, touched }) => (
                <AddEntityFormBody
                    values={values}
                    errors={errors}
                    touched={touched}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    isLoading={state.isLoading}
                />
            )}
        </Formik>
    )
}
export function AddEntityFormBody({
    values,
    errors,
    touched,
    handleSubmit,
    handleChange,
    isLoading
}: {
    values: AddEntityArgs
    errors: FormikErrors<AddEntityArgs>
    touched: FormikTouched<AddEntityArgs>
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: ChangeEventHandler
    isLoading: boolean
}) {
    return (
        <Form noValidate onSubmit={handleSubmit}>
            <Col>
                <FormField
                    name="displayTxt"
                    label="Entity Display Text"
                    value={values.displayTxt}
                    handleChange={handleChange}
                    error={errors.displayTxt}
                    isTouched={touched.displayTxt}
                />
                <FormField
                    name="justification"
                    label="justification for Adding Entity"
                    value={values.justification}
                    handleChange={handleChange}
                    error={errors.justification}
                    isTouched={touched.justification}
                    as="textarea"
                    className="min-h-200px"
                />
                <Row className="justify-content-end">
                    <Col xs="auto">
                        <RemoteSubmitButton label="Add Entity" isLoading={isLoading} />
                    </Col>
                </Row>
            </Col>
        </Form>
    )
}

export function EntityDetailsModal() {
    const dispatch = useAppDispatch()
    const idEntityPersistent = useAppSelector(
        selectShowDetailsForEntityWithIdPersistent
    )
    const showEntityMergingModal = idEntityPersistent !== undefined
    return (
        <Modal
            show={showEntityMergingModal}
            onHide={() => dispatch(setShowDetailsForEntityWithIdPersistent(undefined))}
            size="xl"
            // fullscreen={true}
            key="entity-merging-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Entity Details</Modal.Title>
            </Modal.Header>
            <Modal.Body className="display-block vh-95">
                {showEntityMergingModal ? (
                    <EntityDetails idEntityPersistent={idEntityPersistent} />
                ) : (
                    <div />
                )}
            </Modal.Body>
        </Modal>
    )
}

export function EntityDetails({ idEntityPersistent }: { idEntityPersistent: string }) {
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            dispatch(getEntityDetailsThunk(idEntityPersistent))
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idEntityPersistent]
    )
    return <EntityDetailsComponent />
}

function EntityDetailsComponent() {
    const entityDetails = useAppSelector(selectEntityDetails)
    if (!entityDetails.value) {
        return <Spinner />
    }
    return (
        <Col>
            <DisplayTextComponent entity={entityDetails.value.entity} />
            {entityDetails.value.tagInstanceList?.map((instance, idx) => (
                <TagInstanceComponent
                    idTagDefinitionPersistent={instance.idTagDefinitionPersistent}
                    value={instance.cellValue.value?.toString() ?? ''}
                    alternateBackground={idx % 2 == 0}
                    key={idx}
                />
            ))}
        </Col>
    )
}

function DisplayTextComponent({ entity }: { entity: Entity }) {
    return (
        <Row className="pt-2 ms-2 me-2">
            <Col xs={8}>DisplayText</Col>
            <Col xs={4}>{entity.displayTxt}</Col>
        </Row>
    )
}

function TagInstanceComponent({
    idTagDefinitionPersistent,
    value,
    alternateBackground
}: {
    idTagDefinitionPersistent: string
    value: string
    alternateBackground?: boolean
}) {
    const tagDefinition = useTagDefinition(idTagDefinitionPersistent)
    let colorClass = ''
    if (alternateBackground) {
        colorClass = ' bg-primary-subtle'
    }
    let tagDefinitionComponent = <Spinner />
    if (tagDefinition.value !== undefined) {
        tagDefinitionComponent = (
            <TagDefinitionNamePath tagDefinition={tagDefinition.value} />
        )
    }
    return (
        <Row className={'pt-2 ms-2 me-2' + colorClass}>
            <Col xs={8}>{tagDefinitionComponent}</Col>
            <Col xs={4}>{value}</Col>
        </Row>
    )
}
