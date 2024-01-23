import * as yup from 'yup'
import {
    Badge,
    Button,
    Col,
    Form,
    ListGroup,
    Modal,
    ModalBody,
    Row
} from 'react-bootstrap'
import { useContribution, SubmitUploadCallback } from './hooks'
import { Contribution, ContributionStep, contributionIsReady } from './state'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { HandleChange, SetFieldValue } from '../util/type'
import { ChangeEvent, FormEvent, ReactElement, useEffect, useRef } from 'react'
import { FormField } from '../util/form'
import { useNavigate } from 'react-router-dom'
import { StepHeader } from '../util/components/stepper'
import { ErrorPopover } from '../util/error/components'
import { newErrorState } from '../util/error/slice'

export function ContributionList() {
    const {
        contributions,
        showAddContribution,
        loadContributionsCallback,
        toggleShowAddContributionCallback,
        submitUploadCallback,
        clearUploadErrorCallback
    } = useContribution()
    useEffect(() => {
        loadContributionsCallback()
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAddContribution])
    if (contributions.isLoading) {
        return (
            <div className="cosmae-table-container-outer">
                <div className="cosmae-table-container-inner">
                    <div className="shimmer"></div>
                </div>
            </div>
        )
    }
    return (
        <Col className="d-flex flex-column h-100 ps-1 pe-1">
            <Row className="justify-content-end ps-2 pe-4 mb-2">
                <Col sm="auto" className="pe-5">
                    <Button onClick={toggleShowAddContributionCallback}>
                        Upload CSV
                    </Button>
                </Col>
            </Row>
            <Row className="d-block flex-basis-0 flex-grow-1 overflow-auto scroll-gutter ps-5 pe-5">
                <ListGroup className="pe-0">
                    {contributions.value.map((contribution, idx) => (
                        <ContributionListItem
                            key={contribution.idPersistent}
                            contribution={contribution}
                            eventKey={idx.toString()}
                        />
                    ))}
                </ListGroup>
                <Modal show={showAddContribution.value}>
                    <Modal.Header
                        className="bg-primary"
                        closeButton
                        closeVariant="white"
                        onHide={toggleShowAddContributionCallback}
                    ></Modal.Header>
                    <ModalBody>
                        <UploadForm
                            onSubmit={submitUploadCallback}
                            uploadErrorMsg={showAddContribution.errorMsg}
                            clearUploadErrorCallback={clearUploadErrorCallback}
                        />
                    </ModalBody>
                </Modal>
            </Row>
        </Col>
    )
}

export function ContributionStepper({
    selectedIdx,
    id_persistent,
    children,
    step = ContributionStep.Uploaded
}: {
    selectedIdx?: number
    id_persistent: string
    children: ReactElement
    step?: ContributionStep
}) {
    const navigate = useNavigate()
    let maxIdx = 1
    if (
        step === ContributionStep.ColumnsAssigned ||
        step === ContributionStep.ValuesExtracted
    ) {
        maxIdx = 2
    }
    if (step === ContributionStep.EntitiesAssigned) {
        maxIdx = 3
    }
    return (
        <Col
            className="d-flex flex-column h-100 ps-1 pe-1"
            data-testid="contribution-stepper"
        >
            <StepHeader
                stepNames={['Metadata', 'Columns', 'Entities', 'Complete']}
                selectedIdx={selectedIdx ?? 0}
                activeIdx={maxIdx}
                navigateCallback={(name: string) =>
                    navigate(`/contribute/${id_persistent}/${name.toLowerCase()}`)
                }
            />
            <Row className="d-block flex-basis-0 flex-grow-1 overflow-auto scroll-gutter h-100">
                <Col className="ps-5 pe-5 h-100">{children}</Col>
            </Row>
        </Col>
    )
}

export function ContributionListItem({
    contribution,
    eventKey
}: {
    contribution: Contribution
    eventKey: string
}) {
    const navigate = useNavigate()
    let badgeBackground = 'secondary',
        badgeForeground = 'text-black'
    if (contributionIsReady(contribution)) {
        badgeBackground = 'primary'
        badgeForeground = 'text-white'
    }

    return (
        <ListGroup.Item
            className="nav-link"
            onClick={() => {
                navigate(`/contribute/${contribution.idPersistent}`)
            }}
            eventKey={eventKey}
        >
            <Row className="justify-content-between">
                <Col>
                    <Row className="justify-content-start">
                        <Col xs="auto">
                            <Badge bg={badgeBackground} className={badgeForeground}>
                                {contribution.step}
                            </Badge>
                        </Col>
                        <Col>
                            <span className="link-primary">
                                <u>{contribution.name}</u>
                            </span>
                        </Col>
                    </Row>
                </Col>
                <Col xs={2}>Author: {contribution.author}</Col>
            </Row>
        </ListGroup.Item>
    )
}

export function ContributionStepActionButton({ step }: { step: ContributionStep }) {
    return <Button>{step}</Button>
}

export type UploadFormArgs = {
    name: string
    description: string
    hasHeader: boolean
    file?: File
}
const uploadSchema = yup.object({
    name: yup.string().ensure().min(8),
    description: yup.string().ensure().min(50),
    hasHeader: yup.boolean(),
    file: yup.mixed().nullable().defined()
})

export function UploadForm({
    onSubmit,
    uploadErrorMsg,
    clearUploadErrorCallback
}: {
    onSubmit: SubmitUploadCallback
    uploadErrorMsg?: string
    clearUploadErrorCallback: VoidFunction
}) {
    return (
        <Formik
            onSubmit={(values) => {
                if (values.file !== undefined) {
                    onSubmit({
                        name: values.name,
                        description: values.description,
                        hasHeader: values.hasHeader,
                        file: values.file
                    })
                }
            }}
            initialValues={{
                name: '',
                description: '',
                hasHeader: false,
                file: undefined
            }}
            validationSchema={uploadSchema}
        >
            {({
                values,
                handleSubmit,
                handleChange,
                errors,
                touched,
                setFieldValue
            }) => (
                <UploadFormBody
                    values={values}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    touched={touched}
                    formErrors={errors}
                    uploadErrorMsg={uploadErrorMsg}
                    setFieldValue={setFieldValue}
                    clearUploadErrorCallback={clearUploadErrorCallback}
                />
            )}
        </Formik>
    )
}

export function UploadFormBody({
    values,
    handleSubmit,
    handleChange,
    formErrors,
    touched,
    uploadErrorMsg,
    setFieldValue,
    clearUploadErrorCallback
}: {
    values: UploadFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    touched: FormikTouched<UploadFormArgs>
    formErrors: FormikErrors<UploadFormArgs>
    uploadErrorMsg?: string
    setFieldValue: SetFieldValue
    clearUploadErrorCallback: VoidFunction
}) {
    const containerRef = useRef(null)
    const buttonRef = useRef(null)

    return (
        <Form noValidate onSubmit={handleSubmit} ref={containerRef}>
            <FormField
                name="name"
                handleChange={handleChange}
                type="text"
                value={values.name}
                label="name"
                error={formErrors.name}
                isTouched={touched.name}
            />
            <FormField
                name="description"
                handleChange={handleChange}
                type="text"
                value={values.description}
                label="description"
                error={formErrors.description}
                isTouched={touched.description}
                as="textarea"
            />
            <Form.Group controlId="file" className="d-flex row mb-4 ms-0 me-0">
                {/* <Form.Label>Select CSV</Form.Label> */}
                <Form.Control
                    type="file"
                    isInvalid={touched.file && !!formErrors.file}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        if (!event.currentTarget.files) {
                            return
                        }
                        setFieldValue('file', event.currentTarget.files[0])
                    }}
                />
                <Form.Control.Feedback type="invalid">
                    {formErrors.file}
                </Form.Control.Feedback>
            </Form.Group>
            <Form.Check
                className="mb-4"
                name="hasHeader"
                label="File has header row"
                value={values.hasHeader.toString()}
                onChange={handleChange}
            />
            <Row>
                <Col sm="auto">
                    <Button type="submit" ref={buttonRef}>
                        Submit
                    </Button>
                    {!!uploadErrorMsg && (
                        <ErrorPopover
                            errorState={newErrorState(uploadErrorMsg)}
                            placement="top"
                            clearError={clearUploadErrorCallback}
                            targetRef={buttonRef}
                            containerRef={containerRef}
                        />
                    )}
                </Col>
            </Row>
        </Form>
    )
}
