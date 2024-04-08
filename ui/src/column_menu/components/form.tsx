import { Formik, FormikErrors, FormikTouched } from 'formik'
import { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Button, Col, Row, Form } from 'react-bootstrap'
import { TagDefinition, TagType } from '../state'
import * as yup from 'yup'
import { submitTagDefinition, loadTagDefinitionHierarchy } from '../thunks'
import { AppDispatch } from '../../store'
import { useAppDispatch } from '../../hooks'
import { FormField } from '../../util/form'

const schema = yup.object({
    columnType: yup.string().matches(/STRING|FLOAT|INNER/),
    name: yup.string().required()
})

export type ColumnTypeCreateArgs = {
    columnType: string
    name: string
    parent: string
    description: string
}

export type ColumnTypeCreateFormProps = {
    selectedParent: string
    setParent: (idPersistent: string, namePath: string[]) => Promise<void>
    errors: FormikErrors<ColumnTypeCreateArgs>
}
const emptyTagValues = {
    columnType: '',
    name: '',
    parent: '',
    description: '',
    parentNamePath: [] as string[]
}

export function TagCreateForm({
    existingTagDefinition = undefined,
    children
}: {
    existingTagDefinition?: TagDefinition
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}) {
    const dispatch: AppDispatch = useAppDispatch()
    let initialValues = emptyTagValues
    if (existingTagDefinition !== undefined) {
        initialValues = {
            columnType: existingTagDefinition.columnType as string,
            name: existingTagDefinition.namePath.at(-1) ?? '',
            parent: existingTagDefinition.idParentPersistent ?? '',
            description: existingTagDefinition.description ?? '',
            parentNamePath: existingTagDefinition?.namePath.slice(0, -1) ?? []
        }
    }
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={(values) => {
                dispatch(
                    submitTagDefinition({
                        version: existingTagDefinition?.version,
                        idPersistent: existingTagDefinition?.idPersistent,
                        namePath: existingTagDefinition?.namePath,
                        name: values.name,
                        description: values.description,
                        idParentPersistent:
                            values.parent == '' ? undefined : values.parent,
                        type: values.columnType as TagType,
                        parentNamePath: values.parentNamePath
                    })
                ).then((success) => {
                    if (success) {
                        dispatch(loadTagDefinitionHierarchy({ expand: true }))
                    }
                })
            }}
        >
            {({
                handleSubmit,
                handleChange,
                values,
                errors,
                touched,
                setFieldValue
            }) => (
                <ColumnTypeCreateFormBody
                    handleSubmit={handleSubmit}
                    touchedValues={touched}
                    formErrors={errors}
                    handleChange={handleChange}
                    formValues={values}
                    children={children}
                    setParent={async (idPersistent, namePath) => {
                        setFieldValue('parent', idPersistent)
                        setFieldValue('parentNamePath', namePath)
                    }}
                    alreadyExists={existingTagDefinition !== undefined}
                />
            )}
        </Formik>
    )
}

function ColumnTypeCreateFormBody(props: {
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    touchedValues: FormikTouched<ColumnTypeCreateArgs>
    formErrors: FormikErrors<ColumnTypeCreateArgs>
    handleChange: {
        (e: ChangeEvent): void
        <T = string | ChangeEvent>(field: T): T extends ChangeEvent
            ? void
            : (e: string | ChangeEvent) => void
    }
    setParent: (idPersistent: string, parentNamePath: string[]) => Promise<void>
    formValues: ColumnTypeCreateArgs
    alreadyExists: boolean
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}): JSX.Element {
    return (
        <Form
            noValidate
            onSubmit={props.handleSubmit}
            className="h-100 d-flex flex-column flex-grow-1 flex-shrink-1 mt-3"
        >
            <Row>
                <Col>
                    <FormField
                        name="name"
                        handleChange={props.handleChange}
                        type="text"
                        value={props.formValues.name}
                        label="Name"
                        error={props.formErrors.name}
                        isTouched={props.touchedValues.name}
                    />
                </Col>
            </Row>
            <Row className="justify-content-between mb-2">
                <Col xs={2}>
                    {props.touchedValues.columnType && !!props.formErrors.columnType ? (
                        <span className="invalid-feedback">Choose a type:</span>
                    ) : (
                        <span className="fs-6">Choose a type:</span>
                    )}
                </Col>
                <Col xs={10}>
                    <Row className="justify-content-center d-flex flex-wrap ms-4">
                        <Col>
                            <Form.Check
                                inline
                                type="radio"
                                name="columnType"
                                label="boolean"
                                value={TagType.Inner}
                                checked={props.formValues.columnType === TagType.Inner}
                                onChange={props.handleChange}
                                disabled={props.alreadyExists}
                                isInvalid={
                                    props.touchedValues.columnType &&
                                    !!props.formErrors.columnType
                                }
                            />
                        </Col>
                        <Col>
                            <Form.Check
                                inline
                                type="radio"
                                label="string"
                                name="columnType"
                                value={TagType.String}
                                checked={props.formValues.columnType === TagType.String}
                                onChange={props.handleChange}
                                disabled={props.alreadyExists}
                                isInvalid={
                                    props.touchedValues.columnType &&
                                    !!props.formErrors.columnType
                                }
                            />
                        </Col>
                        <Col>
                            <Form.Check
                                inline
                                type="radio"
                                name="columnType"
                                label="number"
                                value={TagType.Float}
                                checked={props.formValues.columnType === TagType.Float}
                                onChange={props.handleChange}
                                disabled={props.alreadyExists}
                                isInvalid={
                                    props.touchedValues.columnType &&
                                    !!props.formErrors.columnType
                                }
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
            <FormField
                name="description"
                handleChange={props.handleChange}
                type="text"
                value={props.formValues.description}
                label="description"
                error={props.formErrors.description}
                isTouched={props.touchedValues.description}
                as="textarea"
                className="min-h-100px"
            />
            <Row className="ms-1">
                <span className="fst-italic fw-bold ps-0">
                    Select parent from below
                </span>
            </Row>
            <div className="overflow-hidden d-flex flex-column">
                {props.children({
                    setParent: props.setParent,
                    selectedParent: props.formValues.parent,
                    errors: props.formErrors
                })}
            </div>
            <Row className="ms-0 me-0">
                <Button type="submit">{props.alreadyExists ? 'Save' : 'Create'}</Button>
            </Row>
        </Form>
    )
}
