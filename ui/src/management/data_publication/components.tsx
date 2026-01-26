import { Button, Col, ListGroup, Row } from 'react-bootstrap'
import { FormField } from '../../util/form'
import 'react-datepicker/dist/react-datepicker.css'
import DatePicker from 'react-datepicker'
import { useSelector } from 'react-redux'
import { selectDataPublicationMetadataList } from './selectors'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import { HandleChange } from '../../util/type'
import { useAppDispatch } from '../../hooks'
import { addError } from '../../util/notification/slice'
import * as yup from 'yup'
import {
    loadDataPublicationMetadataListThunk,
    submitDataPublicationThunk
} from './thunks'
import { useEffect } from 'react'
import { clearPublicationMetadataList } from './slice'
import { CosmaeLoading } from '../../util/components/misc'
import { DataPublicationMetadata, DataPublicationStep } from './state'
import { config } from '../../config'
import { Link } from 'react-router-dom'

export function DataPublicationManagement() {
    return (
        <Col className="h-100 d-flex flex-column overflow-hidden ps-2 pe-2 pb-3">
            <Row className="flex-grow-0 pb-2">
                <DataPublicationForm />
            </Row>
            <Row className="h-100 overflow-y-scroll scroll-gutter ms-1 me-1">
                <DataPublicationList />
            </Row>
        </Col>
    )
}

export interface DataPublicationFormValues {
    startDate: Date | undefined
    endDate: Date | undefined
    name: string
}

const initialValues: DataPublicationFormValues = {
    startDate: undefined,
    endDate: new Date(Date.now()),
    name: ''
}

const schema = yup.object({
    startDate: yup.date().nullable(),
    endDate: yup.date().required(),
    name: yup.string().ensure().min(8)
})

export function DataPublicationForm() {
    const dispatch = useAppDispatch()
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={(values) => {
                if (values.endDate === undefined) {
                    dispatch(addError('End date is required'))
                    return
                }
                dispatch(
                    submitDataPublicationThunk({
                        ...values,
                        endDate: values.endDate
                    })
                )
            }}
        >
            {({ values, handleChange, setValues, submitForm, errors, touched }) => (
                <DataPublicationFormBody
                    values={values}
                    handleChange={handleChange}
                    setValues={setValues}
                    submitForm={submitForm}
                    errors={errors}
                    touched={touched}
                />
            )}
        </Formik>
    )
}

function DataPublicationFormBody({
    values,
    handleChange,
    setValues,
    submitForm,
    errors,
    touched
}: {
    values: DataPublicationFormValues
    handleChange: HandleChange
    setValues: (values: DataPublicationFormValues) => void
    submitForm: () => void
    errors: FormikErrors<DataPublicationFormValues>
    touched: FormikTouched<DataPublicationFormValues>
}) {
    return (
        <Row>
            <Col>
                <Row>
                    <FormField
                        name="name"
                        label="Name"
                        value={values.name}
                        handleChange={handleChange}
                        isTouched={touched.name}
                        error={errors.name}
                    />
                </Row>
                <Row>
                    <Col>
                        <DateSetter
                            name="Start Date"
                            date={values.startDate}
                            setDate={(date) =>
                                setValues({ ...values, startDate: date })
                            }
                            isClearable={true}
                            isTouched={touched.startDate}
                            error={errors.startDate}
                        />
                    </Col>
                    <Col>
                        <DateSetter
                            name="End Date"
                            date={values.endDate}
                            setDate={(date) => setValues({ ...values, endDate: date })}
                            isTouched={touched.endDate}
                            error={errors.endDate}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col></Col>
                    <Col xs="auto">
                        <Button onClick={submitForm}>Create</Button>
                    </Col>
                </Row>
            </Col>
        </Row>
    )
}
function DateSetter({
    name,
    date,
    setDate,
    isClearable = false,
    isTouched,
    error
}: {
    name: string
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    isClearable?: boolean
    isTouched?: boolean
    error?: string
}) {
    return (
        <Row>
            <Col>
                <Row>
                    <Col>{name}</Col>
                    <Col>
                        <DatePicker
                            name={name}
                            showYearDropdown
                            selected={date}
                            isClearable={isClearable && date !== undefined}
                            dateFormat={'dd MMM yyyy'}
                            onChange={(date) => {
                                setDate(date ?? undefined)
                            }}
                        />
                    </Col>
                </Row>
                <Row>
                    {isTouched && !!error ? (
                        <span className="text-danger">{error}</span>
                    ) : (
                        <span className="text-transparent">&#8203;</span>
                    )}
                </Row>
            </Col>
        </Row>
    )
}

export function DataPublicationList() {
    const dispatch = useAppDispatch()
    const publicationMetadataList = useSelector(selectDataPublicationMetadataList)
    useEffect(() => {
        if (
            publicationMetadataList.isLoading ||
            publicationMetadataList.value != undefined
        ) {
            return
        }
        dispatch(loadDataPublicationMetadataListThunk())
        return () => {
            clearPublicationMetadataList()
        }
    })
    if (
        publicationMetadataList.value === undefined ||
        publicationMetadataList.isLoading
    ) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup className="">
            {publicationMetadataList.value.map((item) => (
                <DataPublicationListItem key={item.idPersistent} item={item} />
            ))}
        </ListGroup>
    )
}

function DataPublicationListItem({ item }: { item: DataPublicationMetadata }) {
    return (
        <ListGroup.Item className="mt-1 mb-1" key={item.idPersistent}>
            <Col>
                <Row className="fw-bold">
                    <Col>{item.name}</Col>
                    <Col xs="auto">
                        <ResultsLink
                            idPersistent={item.idPersistent}
                            step={item.step}
                        />
                    </Col>
                </Row>
                <Row className="justify-content-start">
                    <Col>
                        <Row>
                            <Col xs="auto" className="fw-bold">
                                Start:
                            </Col>
                            <Col>{item.startDateString ?? 'Beginning of Time'}</Col>
                        </Row>
                    </Col>
                    <Col>
                        <Row>
                            <Col xs="auto" className="fw-bold">
                                End:
                            </Col>
                            <Col>{item.endDateString}</Col>
                        </Row>
                    </Col>
                    <Col xs={1} m={2}></Col>
                </Row>
            </Col>
        </ListGroup.Item>
    )
}

export function ResultsLink({
    idPersistent,
    step
}: {
    idPersistent: string
    step: DataPublicationStep
}) {
    if (step !== DataPublicationStep.Completed) {
        return (
            <Button disabled>Download</Button>
        )
    }
    return (
        <Link to={`${config.api_path}/manage/data_publication/${idPersistent}/results`} >
            <Button disabled={step !== DataPublicationStep.Completed}>Download</Button>
        </Link>
    )
}
