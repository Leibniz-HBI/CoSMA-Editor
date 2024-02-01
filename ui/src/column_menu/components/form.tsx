import { Formik, FormikErrors, FormikTouched } from 'formik'
import { ChangeEvent, FormEvent, ReactNode, useRef } from 'react'
import { Button, Col, FormLabel, Row, Form } from 'react-bootstrap'
import { TagType } from '../state'
import * as yup from 'yup'
import { submitTagDefinition, loadTagDefinitionHierarchy } from '../thunks'
import { AppDispatch } from '../../store'
import { useAppDispatch } from '../../hooks'

const schema = yup.object({
    columnType: yup.number().required(),
    name: yup.string().required()
})

export type ColumnTypeCreateArgs = { columnType: string; name: string; parent: string }

export type ColumnTypeCreateFormProps = {
    selectedParent: string
    handleChange: (event: ChangeEvent) => void
    errors: FormikErrors<ColumnTypeCreateArgs>
}

export function ColumnTypeCreateForm({
    children
}: {
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}) {
    const dispatch: AppDispatch = useAppDispatch()
    return (
        <Formik
            initialValues={{ columnType: '', name: '', parent: '' }}
            validationSchema={schema}
            onSubmit={(values) => {
                dispatch(
                    submitTagDefinition({
                        name: values.name,
                        idParentPersistent:
                            values.parent == '' ? undefined : values.parent,
                        columnTypeIdx: parseInt(values.columnType)
                    })
                ).then((success) => {
                    if (success) {
                        dispatch(loadTagDefinitionHierarchy({ expand: true }))
                    }
                })
            }}
        >
            {({ handleSubmit, handleChange, values, errors, touched }) => (
                <ColumnTypeCreateFormBody
                    handleSubmit={handleSubmit}
                    touchedValues={touched}
                    formErrors={errors}
                    handleChange={handleChange}
                    formValues={values}
                    children={children}
                />
            )}
        </Formik>
    )
}

function ColumnTypeCreateFormBody(props: {
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    touchedValues: FormikTouched<ColumnTypeCreateArgs>
    formErrors: FormikErrors<{ columnType: string; name: string; parent: string }>
    handleChange: {
        (e: ChangeEvent): void
        <T = string | ChangeEvent>(field: T): T extends ChangeEvent
            ? void
            : (e: string | ChangeEvent) => void
    }
    formValues: ColumnTypeCreateArgs
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}): JSX.Element {
    const containerRef = useRef(null)
    const targetRef = useRef(null)
    return (
        <Form
            noValidate
            onSubmit={props.handleSubmit}
            ref={containerRef}
            className="h-100 d-flex flex-column flex-grow-1 flex-shrink-1"
        >
            <Row>
                {props.touchedValues.name && !!props.formErrors.name ? (
                    <span className="text-danger fs-6">Choose a column name:</span>
                ) : (
                    <span className="fs-6">Choose a column name: </span>
                )}
            </Row>
            <Row className="justify-content-end">
                <Col sm={2}></Col>
                <Col sm={10}>
                    <FormLabel htmlFor="name">
                        <input type="text" name="name" onChange={props.handleChange} />
                    </FormLabel>
                </Col>
            </Row>
            <Row>
                {props.touchedValues.columnType && !!props.formErrors.columnType ? (
                    <span className="text-danger fs-6">Choose a column type:</span>
                ) : (
                    <span className="fs-6">Choose a column type:</span>
                )}
            </Row>
            <Row className="justify-content-end">
                <Col></Col>
                <Col>
                    <Form.Check
                        inline
                        type="radio"
                        name="columnType"
                        label="boolean"
                        value={TagType.Inner}
                        onChange={props.handleChange}
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
                        onChange={props.handleChange}
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
                        onChange={props.handleChange}
                        isInvalid={
                            props.touchedValues.columnType &&
                            !!props.formErrors.columnType
                        }
                    />
                </Col>
            </Row>
            <Row className="ms-1 mb-1 mt-2">
                <span className="fst-italic fw-bold ps-0">
                    Select parent from below
                </span>
            </Row>
            <div className="overflow-hidden d-flex flex-column">
                {props.children({
                    handleChange: props.handleChange,
                    selectedParent: props.formValues.parent,
                    errors: props.formErrors
                })}
            </div>
            <Row className="ms-0 me-0">
                <Button type="submit" ref={targetRef}>
                    Create
                </Button>
            </Row>
        </Form>
    )
}
