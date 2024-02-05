import * as yup from 'yup'
import { FormEvent, useLayoutEffect } from 'react'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { HandleChange } from '../../util/type'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import { ContributionStepper } from '../components'
import { useLoaderData } from 'react-router-dom'
import { Contribution } from '../state'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectContribution } from '../selectors'
import { loadContributionDetails, patchContributionDetails } from '../thunks'

export type PatchContributionCallback = ({
    name,
    description,
    hasHeader
}: {
    name?: string
    description?: string
    hasHeader?: boolean
}) => void

export function ContributionDetailsStep() {
    const idPersistent = useLoaderData() as string
    const dispatch = useAppDispatch()
    const contribution = useAppSelector(selectContribution)

    useLayoutEffect(() => {
        if (!contribution.isLoading) {
            dispatch(loadContributionDetails(idPersistent))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idPersistent])
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
        <ContributionStepper
            selectedIdx={0}
            id_persistent={idPersistent}
            step={contribution.value.step}
        >
            <EditForm
                contribution={contribution.value}
                onSubmit={({ name, description, hasHeader }) => {
                    dispatch(
                        patchContributionDetails({
                            idPersistent,
                            name,
                            description,
                            hasHeader
                        })
                    )
                }}
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
    description: yup.string(),
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
    return (
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
                <Col sm="auto">
                    <Button type="submit">Edit</Button>
                </Col>
            </Row>
        </Form>
    )
}
