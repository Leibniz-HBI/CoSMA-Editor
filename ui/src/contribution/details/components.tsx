import * as yup from 'yup'
import { FormEvent, useLayoutEffect, useRef } from 'react'
import { PatchContributionCallback, useContributionDetails } from './hooks'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { HandleChange } from '../../util/type'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import { ContributionStepper } from '../components'
import { useLoaderData } from 'react-router-dom'
import { Contribution } from '../state'

export function ContributionDetailsStep() {
    const idPersistent = useLoaderData() as string
    const {
        remoteContribution,
        loadContributionDetailsCallback,
        patchContributionDetailsCallback
    } = useContributionDetails(idPersistent)
    useLayoutEffect(() => {
        loadContributionDetailsCallback()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idPersistent])
    if (remoteContribution.isLoading || remoteContribution.value == undefined) {
        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <div className="shimmer"></div>
                </div>
            </div>
        )
    }
    return (
        <ContributionStepper
            selectedIdx={0}
            id_persistent={idPersistent}
            step={remoteContribution.value.step}
        >
            <EditForm
                contribution={remoteContribution.value}
                onSubmit={patchContributionDetailsCallback}
            />
        </ContributionStepper>
    )
}

export type EditFormArgs = {
    name: string
    description: string
    hasHeader: boolean
}
const editSchema = yup.object({
    name: yup.string().defined().min(8),
    description: yup.string().defined().min(50),
    hasHeader: yup.boolean()
})

export function EditForm({
    contribution,
    onSubmit
}: {
    contribution: Contribution
    onSubmit: PatchContributionCallback
}) {
    return (
        <Formik
            onSubmit={(values) => {
                onSubmit({
                    name: values.name,
                    description: values.description,
                    hasHeader: values.hasHeader
                })
            }}
            initialValues={{
                name: contribution.name,
                description: contribution.description,
                hasHeader: contribution.hasHeader
            }}
            validationSchema={editSchema}
        >
            {({ values, handleSubmit, handleChange, errors, touched }) => (
                <EditFormBody
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
    values,
    handleSubmit,
    handleChange,
    formErrors,
    touched
}: {
    values: EditFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    touched: FormikTouched<EditFormArgs>
    formErrors: FormikErrors<EditFormArgs>
}) {
    const containerRef = useRef(null)
    const buttonRef = useRef(null)

    return (
        <Form noValidate onSubmit={handleSubmit} ref={containerRef}>
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
                    />
                    <Form.Check
                        className="mb-4"
                        name="hasHeader"
                        label="File has header row"
                        checked={values.hasHeader}
                        onChange={handleChange}
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
                    />
                </Col>
            </Row>
            <Row className="justify-content-end">
                <Col sm="auto">
                    <Button type="submit" ref={buttonRef}>
                        Edit
                    </Button>
                </Col>
            </Row>
        </Form>
    )
}
