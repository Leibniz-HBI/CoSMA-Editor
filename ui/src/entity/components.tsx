import { ChangeEventHandler, FormEvent } from 'react'
import { Col, Form, Row } from 'react-bootstrap'
import { FormField } from '../util/form'
import { RemoteSubmitButton } from '../util/components/misc'
import { RemoteInterface } from '../util/state'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import * as yup from 'yup'

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
