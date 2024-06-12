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
import { Contribution, ContributionStep, contributionIsReady } from './state'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { HandleChange, SetFieldValue } from '../util/type'
import { ChangeEvent, FormEvent, useEffect, useRef } from 'react'
import { FormField } from '../util/form'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { StepHeader } from '../util/components/stepper'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
    getContributionList,
    loadContributionDetails,
    uploadContribution
} from './thunks'
import {
    selectContribution,
    selectContributionList,
    selectReloadDelay,
    selectShowAddContribution
} from './selectors'
import { CosmaeLoading } from '../util/components/misc'
import {
    decrementDelay,
    resetDelay,
    resetSelectedContribution,
    toggleShowAddContribution
} from './slice'
import { secondDelay } from '../config'
import { ContributionDetailsStep } from './details/components'
import { ColumnDefinitionStep } from './columns/components'
import { EntitiesStep } from './entity/components'
import { CompleteStep } from './complete/components'

export function ContributionList() {
    const dispatch = useAppDispatch()
    const contributions = useAppSelector(selectContributionList)
    const showAddContribution = useAppSelector(selectShowAddContribution)
    useEffect(() => {
        if (!contributions.isLoading) {
            dispatch(getContributionList())
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAddContribution])
    if (contributions.isLoading) {
        return <CosmaeLoading />
    }
    const toggleShowAddContributionCallback = () =>
        dispatch(toggleShowAddContribution())
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
                <Modal show={showAddContribution}>
                    <Modal.Header
                        className="bg-primary"
                        closeButton
                        closeVariant="white"
                        onHide={toggleShowAddContributionCallback}
                    ></Modal.Header>
                    <ModalBody>
                        <UploadForm />
                    </ModalBody>
                </Modal>
            </Row>
        </Col>
    )
}

export function ContributionStepper({ selectedIdx }: { selectedIdx: number }) {
    const idContributionPersistent = useLoaderData() as string
    const dispatch = useAppDispatch()
    useEffect(() => {
        return () => {
            dispatch(resetSelectedContribution())
        }
    })
    return (
        <ContributionStepperDisplay
            idContributionPersistent={idContributionPersistent}
            selectedIdx={selectedIdx}
        />
    )
}
function ContributionStepperDisplay({
    selectedIdx,
    idContributionPersistent
}: {
    selectedIdx: number
    idContributionPersistent: string
}) {
    const navigate = useNavigate()
    const contribution = useAppSelector(selectContribution)
    const reloadDelay = useAppSelector(selectReloadDelay)
    const dispatch = useAppDispatch()
    let maxIdx = 1
    let processingMessage: string | undefined = undefined
    switch (contribution.value?.step) {
        case ContributionStep.Uploaded:
            processingMessage = 'Columns not yet extracted'
            break
        case ContributionStep.ColumnsAssigned:
            processingMessage = 'Values not yet extracted'
            maxIdx = 2
            break
        case ContributionStep.ValuesExtracted:
            maxIdx = 2
            break
        case ContributionStep.EntitiesAssigned:
            processingMessage = 'Entities not yet merged.'
            maxIdx = 3
            break
        case ContributionStep.Merged:
            maxIdx = 3
            break
    }
    useEffect(() => {
        if (contribution?.isLoading) {
            return
        }
        if (
            contribution.value?.idPersistent !== undefined &&
            idContributionPersistent != contribution.value?.idPersistent
        ) {
            dispatch(resetSelectedContribution())
            return
        }
        if (contribution.value === undefined) {
            dispatch(loadContributionDetails(idContributionPersistent))
        } else if (selectedIdx == maxIdx && processingMessage !== undefined) {
            if (reloadDelay == 0) {
                dispatch(loadContributionDetails(idContributionPersistent)).then(() =>
                    dispatch(resetDelay())
                )
            } else {
                setTimeout(() => dispatch(decrementDelay()), secondDelay)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        contribution.value?.idPersistent,
        reloadDelay,
        selectedIdx,
        maxIdx,
        processingMessage
    ])
    let body
    if (selectedIdx > maxIdx) {
        body = (
            <Row className="justify-content-center">
                This step is not yet available for this contribution. Please select an
                available step.
            </Row>
        )
    } else if (selectedIdx == maxIdx && processingMessage !== undefined) {
        if (
            contribution.isLoading ||
            contribution.value?.idPersistent != idContributionPersistent
        ) {
            body = <CosmaeLoading />
        } else {
            body = (
                <Row>
                    <Col>
                        <Row className="justify-content-center">{`Data not yet available: "${processingMessage}".`}</Row>
                        <Row className="justify-content-center">{`Reloading in ${reloadDelay} seconds.`}</Row>
                    </Col>
                </Row>
            )
        }
    } else {
        switch (selectedIdx) {
            case 0:
                body = <ContributionDetailsStep />
                break
            case 1:
                body = <ColumnDefinitionStep />
                break
            case 2:
                body = <EntitiesStep />
                break
            case 3:
                body = <CompleteStep />
                break
            default:
                body = (
                    <Row className="justify-content-center"> Invalid step selected</Row>
                )
        }
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
                    navigate(
                        `/contribute/${
                            contribution.value?.idPersistent
                        }/${name.toLowerCase()}`
                    )
                }
            />
            <Row className="d-block flex-basis-0 flex-grow-1 overflow-auto scroll-gutter h-100">
                <Col className="ps-5 pe-5 h-100">{body}</Col>
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
    emptyValues: string
    file?: File
}
const uploadSchema = yup.object({
    name: yup.string().ensure().min(8),
    description: yup.string(),
    emptyValues: yup.string(),
    hasHeader: yup.boolean(),
    file: yup.mixed().nullable().defined()
})

export function UploadForm() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    return (
        <Formik
            onSubmit={(values) => {
                if (values.file !== undefined) {
                    dispatch(
                        uploadContribution({
                            name: values.name,
                            description: values.description,
                            hasHeader: values.hasHeader,
                            emptyValues: values.emptyValues,
                            file: values.file
                        })
                    ).then((idPersistent) => {
                        if (idPersistent !== undefined) {
                            navigate('/contribute/' + idPersistent + '/columns')
                        }
                    })
                }
            }}
            initialValues={{
                name: '',
                description: '',
                hasHeader: false,
                emptyValues: 'nan,null,na',
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
                    setFieldValue={setFieldValue}
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
    setFieldValue
}: {
    values: UploadFormArgs
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    handleChange: HandleChange
    touched: FormikTouched<UploadFormArgs>
    formErrors: FormikErrors<UploadFormArgs>
    setFieldValue: SetFieldValue
}) {
    const containerRef = useRef(null)
    const buttonRef = useRef(null)

    return (
        <Form noValidate onSubmit={handleSubmit} ref={containerRef} role="form">
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
            <FormField
                name="emptyValues"
                handleChange={handleChange}
                type="text"
                value={values.emptyValues}
                label="Empty Values"
                error={formErrors.emptyValues}
                isTouched={touched.emptyValues}
            />
            <Row>
                <Col sm="auto">
                    <Button type="submit" ref={buttonRef}>
                        Submit
                    </Button>
                </Col>
            </Row>
        </Form>
    )
}
