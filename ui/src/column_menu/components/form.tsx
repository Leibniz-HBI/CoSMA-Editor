import { Formik, FormikErrors, FormikTouched } from 'formik'
import { ChangeEvent, FormEvent, ReactNode, useRef } from 'react'
import {
    Button,
    Col,
    FormLabel,
    Row,
    Form,
    Overlay,
    Popover,
    CloseButton,
    Container
} from 'react-bootstrap'
import { ColumnType } from '../state'
import * as yup from 'yup'
import { SubmitColumnDefinitionArgs } from '../hooks'
import { ErrorState } from '../../util/error'

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
    submitColumnDefinitionCallback,
    submitError,
    clearError,
    children
}: {
    submitColumnDefinitionCallback: (args: SubmitColumnDefinitionArgs) => void
    submitError?: ErrorState
    clearError: () => void
    children: (formProps?: ColumnTypeCreateFormProps) => ReactNode
}) {
    return (
        <Formik
            initialValues={{ columnType: '', name: '', parent: '' }}
            validationSchema={schema}
            onSubmit={(values) => {
                submitColumnDefinitionCallback({
                    name: values.name,
                    idParentPersistent: values.parent == '' ? undefined : values.parent,
                    columnTypeIdx: parseInt(values.columnType)
                })
            }}
        >
            {({ handleSubmit, handleChange, values, errors, touched }) => (
                <ColumnTypeCreateFormBody
                    handleSubmit={handleSubmit}
                    submitError={submitError}
                    clearError={clearError}
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
    submitError?: ErrorState
    clearError: () => void
    touchedValues: FormikTouched<ColumnTypeCreateArgs>
    formErrors: FormikErrors<{ columnType: string; name: string; parent: string }>
    handleChange: {
        (e: ChangeEvent): void
        <T = string | ChangeEvent>(field: T): T extends ChangeEvent
            ? void
            : (e: string | ChangeEvent) => void
    }
    formValues: ColumnTypeCreateArgs
    children: (formProps?: ColumnTypeCreateFormProps) => ReactNode
}): JSX.Element {
    const containerRef = useRef(null)
    const targetRef = useRef(null)
    return (
        <Form noValidate onSubmit={props.handleSubmit} ref={containerRef}>
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
                        label="parent"
                        value={ColumnType.Inner}
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
                        value={ColumnType.String}
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
                        value={ColumnType.Float}
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
            <Row>
                {props.children({
                    handleChange: props.handleChange,
                    selectedParent: props.formValues.parent,
                    errors: props.formErrors
                })}
            </Row>
            <Row className="ms-0 me-0">
                <Button type="submit" ref={targetRef}>
                    Create
                </Button>
                {!!props.submitError && (
                    <Overlay
                        show={true}
                        target={targetRef}
                        container={containerRef}
                        placement="top"
                    >
                        <Popover id="submit-column-definition-error-popover">
                            <Popover.Header className="bg-danger text-light">
                                <Row className="justify-content-between">
                                    <Col>Error</Col>
                                    <CloseButton
                                        variant="white"
                                        onClick={props.clearError}
                                    ></CloseButton>
                                </Row>
                            </Popover.Header>
                            <Popover.Body>
                                <Row>{props.submitError?.msg}</Row>
                                {!!props.submitError.retryCallback && (
                                    <div className="d-flex justify-content-end">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={props.submitError.retryCallback}
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                )}
                            </Popover.Body>
                        </Popover>
                    </Overlay>
                )}
            </Row>
        </Form>
    )
}
