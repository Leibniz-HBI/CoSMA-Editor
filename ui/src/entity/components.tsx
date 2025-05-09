import {
    ChangeEvent,
    ChangeEventHandler,
    FormEvent,
    useEffect,
    useRef,
    useState
} from 'react'
import {
    Col,
    Form,
    ListGroup,
    Overlay,
    Placeholder,
    Row,
    Spinner
} from 'react-bootstrap'
import { FormField } from '../util/form'
import { RemoteSubmitButton } from '../util/components/misc'
import { RemoteInterface } from '../util/state'
import { Formik, FormikErrors, FormikTouched } from 'formik'
import * as yup from 'yup'
import { useAppDispatch, useAppSelector } from '../hooks'
import { getEntityValuesThunk, getEntitySearchResultsThunk } from './thunks'
import { selectEntityDetails, selectEntitySearchResultEntries } from './selectors'
import { useColumn } from '../column_menu/hooks'
import { ColumnNamePath, ColumnNamePathFromId } from '../column_menu/components/misc'
import { Entity, EntitySearchResult } from './state'
import { AppDispatch } from '../store'
import { debounce } from 'debounce'
import { clearEntitySearchResults } from './slice'
import { useEntity } from './hooks'

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

export function EntityDetails({ idEntityPersistent }: { idEntityPersistent: string }) {
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            dispatch(getEntityValuesThunk(idEntityPersistent))
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idEntityPersistent]
    )
    return <EntityDetailsComponent />
}

function EntityDetailsComponent() {
    const entityDetails = useAppSelector(selectEntityDetails)
    if (!entityDetails.value) {
        return <Spinner />
    }
    return (
        <Col>
            <DisplayTextComponent entity={entityDetails.value.entity} />
            {entityDetails.value.valueList?.map((instance, idx) => (
                <ValueComponent
                    idColumnPersistent={instance.idColumnPersistent}
                    value={instance.cellValue.value?.toString() ?? ''}
                    alternateBackground={idx % 2 == 0}
                    key={idx}
                />
            ))}
        </Col>
    )
}

function DisplayTextComponent({ entity }: { entity: Entity }) {
    return (
        <Row className="pt-2 ms-2 me-2">
            <Col xs={8}>DisplayText</Col>
            <Col xs={4}>{entity.displayTxt}</Col>
        </Row>
    )
}

function ValueComponent({
    idColumnPersistent,
    value,
    alternateBackground
}: {
    idColumnPersistent: string
    value: string
    alternateBackground?: boolean
}) {
    const column = useColumn(idColumnPersistent)
    let colorClass = ''
    if (alternateBackground) {
        colorClass = ' bg-primary-subtle'
    }
    let columnComponent = <Spinner />
    if (column.value !== undefined) {
        columnComponent = <ColumnNamePath column={column.value} />
    }
    return (
        <Row className={'pt-2 ms-2 me-2' + colorClass}>
            <Col xs={8}>{columnComponent}</Col>
            <Col xs={4}>{value}</Col>
        </Row>
    )
}
const debouncedSearchDispatch = debounce(
    (searchTerm: string, dispatch: AppDispatch) =>
        dispatch(getEntitySearchResultsThunk(searchTerm)),
    400
)

const debouncedSearchDispatchThunk = (searchTerm: string) => (dispatch: AppDispatch) =>
    debouncedSearchDispatch(searchTerm, dispatch)

export function EntitySearch({
    onSearchResultClicked,
    resultsClassName = ''
}: {
    onSearchResultClicked: (idEntityPersistent: string) => void
    resultsClassName?: string
}) {
    const [searchString, setSearchString] = useState('')
    const dispatch = useAppDispatch()
    useEffect(() => {
        return () => {
            dispatch(clearEntitySearchResults())
        }
    })
    const target = useRef(null)

    return (
        <Col>
            <FormField
                label="Search Entity"
                name="search-entity"
                value={searchString}
                handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const searchTerm = e.target.value
                    setSearchString(searchTerm)
                    if (searchTerm) {
                        debouncedSearchDispatchThunk(searchTerm)(dispatch)
                    } else {
                        dispatch(clearEntitySearchResults())
                    }
                }}
                ref={target}
            />
            <Overlay target={target} show={searchString != ''} placement="bottom-start">
                {({
                    placement: _placement,
                    arrowProps: _arrowProps,
                    show: _show,
                    popper: _popper,
                    hasDoneInitialMeasure: _hasDoneInitialMeasure,
                    ...props
                }) => {
                    return (
                        <Row
                            {...props}
                            style={{
                                position: 'relative',
                                paddingTop: '4px',
                                paddingLeft: '12px',
                                ...props.style
                            }}
                        >
                            <div className={resultsClassName}>
                                <div className="h-100 overflow-y-scroll scroll-gutter">
                                    <EntitySearchResults
                                        onSearchResultClicked={(idEntityPersistent) => {
                                            onSearchResultClicked(idEntityPersistent)
                                            dispatch(clearEntitySearchResults())
                                            setSearchString('')
                                        }}
                                    />
                                </div>
                            </div>
                        </Row>
                    )
                }}
            </Overlay>
        </Col>
    )
}

export function EntitySearchResults({
    onSearchResultClicked,
    className = ''
}: {
    onSearchResultClicked: (idEntityPersistent: string) => void
    className?: string
}) {
    const searchResults = useAppSelector(selectEntitySearchResultEntries)
    let items = [<ListGroup.Item>No entities found</ListGroup.Item>]
    if (searchResults?.length != 0) {
        items = searchResults?.map((result, idx) => (
            <EntitySearchResultItem
                result={result}
                onSearchResultClicked={onSearchResultClicked}
                key={idx}
            />
        )) ?? [<ListGroup.Item key={-1} />]
    }
    return <ListGroup className={className}>{items}</ListGroup>
}

export function EntitySearchResultItem({
    result,
    onSearchResultClicked
}: {
    result: EntitySearchResult
    onSearchResultClicked: (idEntityPersistent: string) => void
}) {
    const entity = useEntity(result.idEntityPersistent)
    return (
        <ListGroup.Item
            onClick={() => onSearchResultClicked(result.idEntityPersistent)}
        >
            <Col className="ps-2 pe-2">
                <Row className="">
                    {entity.value?.displayTxt ??
                        (entity.isLoading && entity.value === undefined ? (
                            <Placeholder>{result.matchValue}</Placeholder>
                        ) : (
                            result.matchValue
                        ))}
                </Row>
                <Row className="fw-light">
                    <Col>
                        <span>Found by: </span>
                        {result.idColumnPersistent !== undefined ? (
                            <ColumnNamePathFromId
                                idColumnPersistent={result.idColumnPersistent}
                            />
                        ) : (
                            <span>Display Text</span>
                        )}
                    </Col>
                </Row>
            </Col>
        </ListGroup.Item>
    )
}
