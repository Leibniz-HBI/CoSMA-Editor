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
import { ErrorPopover } from '../../util/error/components'
import { newErrorState } from '../../util/error/slice'

export function ContributionDetailsStep() {
    const idPersistent = useLoaderData() as string
    const {
        remoteContribution,
        patchContribution,
        loadContributionDetailsCallback,
        patchContributionDetailsCallback,
        clearPatchContributionErrorCallback
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
                editErrorMsg={patchContribution.errorMsg}
                clearEditErrorCallback={clearPatchContributionErrorCallback}
            />
        </ContributionStepper>
    )
}

export type EditFormArgs = {
    name: string
    description: string
    anonymous: boolean
    hasHeader: boolean
}
const editSchema = yup.object({
    name: yup.string().defined().min(8),
    description: yup.string().defined().min(50),
    anonymous: yup.boolean(),
    hasHeader: yup.boolean()
})

export function EditForm({
    contribution,
    onSubmit,
    editErrorMsg,
    clearEditErrorCallback
}: {
    contribution: Contribution
    onSubmit: PatchContributionCallback
    editErrorMsg?: string
    clearEditErrorCallback: VoidFunction
}) {
    return (
        <Formik
            onSubmit={(values) => {
                onSubmit({
                    name: values.name,
                    description: values.description,
                    anonymous: values.anonymous,
                    hasHeader: values.hasHeader
                })
            }}
            initialValues={{
                name: contribution.name,
                description: contribution.description,
                anonymous: contribution.anonymous,
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
                    editErrorMsg={editErrorMsg}
                    clearEditErrorCallback={clearEditErrorCallback}
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
    touched,
    editErrorMsg,
    clearEditErrorCallback
}: {
    values: EditFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    touched: FormikTouched<EditFormArgs>
    formErrors: FormikErrors<EditFormArgs>
    editErrorMsg?: string
    clearEditErrorCallback: VoidFunction
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
                    <Form.Check
                        className="mb-4"
                        name="anonymous"
                        label="Submit anonymously"
                        checked={values.anonymous}
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
                    {!!editErrorMsg && (
                        <ErrorPopover
                            errorState={newErrorState(editErrorMsg)}
                            placement="top"
                            clearError={clearEditErrorCallback}
                            targetRef={buttonRef}
                            containerRef={containerRef}
                        />
                    )}
                </Col>
            </Row>
        </Form>
    )
}
