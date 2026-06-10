import { Button, Col, Form, FormCheck, ListGroup, Modal, Row } from 'react-bootstrap'
import { ColumnDefinitionContribution } from './state'
import { useEffect, useRef, useState } from 'react'
import { ColumnSelector, EditModal } from '../../column_menu/components/selection'
import {
    RemoteTriggerButton,
    CosmaeLoading,
    CosmaeCard
} from '../../util/components/misc'
import { Column } from '../../column_menu/state'
import {
    ColumnCreateForm,
    ColumnTypeCreateFormProps
} from '../../column_menu/components/form'
import { useDispatch, useSelector } from 'react-redux'
import {
    finalizeColumnAssignment,
    loadColumnDefinitionsContribution,
    loadPreview,
    patchColumnDefinitionContribution
} from './thunks'
import { AppDispatch } from '../../store'
import { setColumnDefinitionFormTab } from './slice'
import {
    selectColumnDefinitionsContributionTriple,
    selectContributionColumnDefinitionById,
    selectCreateTabSelected,
    selectFinalizeColumnAssignment,
    selectPreview
} from './selectors'
import { selectColumnSelectionLoading } from '../../column_menu/selectors'
import { loadColumnHierarchy } from '../../column_menu/thunks'
import { RemoteInterface } from '../../util/state'
import { selectContribution } from '../selectors'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { loadContributionDetails } from '../thunks'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Flipped, Flipper } from 'react-flip-toolkit'
import { ColumnNamePathFromId } from '../../column_menu/components/misc'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'
import { StepperLoaderData } from '../components'

export function ColumnDefinitionStep() {
    const dispatch: AppDispatch = useDispatch()
    const definitions = useAppSelector(selectColumnDefinitionsContributionTriple)
    const idColumnContributionPersistent =
        useLoaderData<StepperLoaderData<string>>().stepData
    const selectedColumnDefinition = useAppSelector(
        selectContributionColumnDefinitionById
    )(idColumnContributionPersistent)
    const createTabSelected = useAppSelector(selectCreateTabSelected)
    const isLoadingColumns = useAppSelector(selectColumnSelectionLoading)
    const contributionCandidate = useAppSelector(selectContribution)
    const ref = useRef(null)
    const [scroll, setScroll] = useState(0)
    console.log(idColumnContributionPersistent)
    useEffect(() => {
        if (contributionCandidate.value != undefined && !definitions.isLoading) {
            dispatch(
                loadColumnDefinitionsContribution(
                    contributionCandidate.value.idPersistent
                )
            ).then(async () => {
                if (!isLoadingColumns) {
                    await dispatch(loadColumnHierarchy({ expand: true }))
                }
            })
        }
    }, [contributionCandidate.value?.idPersistent])
    useEffect(() => {
        if (ref.current) {
            ;(ref.current as HTMLElement).scrollTop = scroll
        }
    }, [ref.current])
    if (definitions.isLoading || contributionCandidate.value === undefined) {
        return <CosmaeLoading />
    }
    const idContributionPersistent = contributionCandidate.value.idPersistent
    return (
        <Row className="overflow-hidden h-100">
            <Col
                xs={3}
                className="h-100 overflow-hidden d-flex flex-column flex-grow-0"
                key="column-definition-selection"
            >
                <Row className="text-primary">
                    <span>Columns extracted from upload:</span>
                </Row>
                <Row
                    className="flex-grow-1 overflow-y-scroll mb-3"
                    ref={ref}
                    onScroll={(ev) => {
                        // console.log((ev.target as HTMLElement).scrollTop)
                        setScroll((ev.target as HTMLElement).scrollTop)
                    }}
                >
                    <ContributionColumnsList
                        idContributionPersistent={idContributionPersistent}
                        selectedColumnDefinition={selectedColumnDefinition}
                    />
                </Row>
                <Row className="align-self-center d-block">
                    <CompleteColumnAssignmentButton
                        idContributionPersistent={idContributionPersistent}
                    />
                </Row>
            </Col>
            <Col
                key="column-definition-assignment-form"
                className="ps-1 pe-1 h-100"
                data-testid="column-assignment-form-column"
            >
                <ContributionColumnAssignmentForm
                    columnDefinition={selectedColumnDefinition.value}
                    createTabSelected={createTabSelected}
                    idContributionPersistent={idContributionPersistent}
                />
            </Col>
        </Row>
    )
}

const _spring = { stiffness: 500, damping: 60, overShootClamping: false }

function ContributionColumnsList({
    idContributionPersistent,
    selectedColumnDefinition
}: {
    idContributionPersistent: string
    selectedColumnDefinition: RemoteInterface<ColumnDefinitionContribution | undefined>
}) {
    const definitions = useAppSelector(selectColumnDefinitionsContributionTriple)
    const navigate = useNavigate()
    const selectCallback = (columnDefinition: ColumnDefinitionContribution) => {
        console.log(idContributionPersistent, columnDefinition.idPersistent)
        navigate(
            `/contribute/${idContributionPersistent}/columns/${columnDefinition.idPersistent}`
        )
    }
    return (
        <ListGroup>
            <Flipper flipKey={definitions.value?.activeDefinitionsList}>
                {definitions.value?.activeDefinitionsList.map((colDef) => (
                    <Flipped
                        key={colDef.idPersistent}
                        flipId={colDef.idPersistent}
                        spring={_spring}
                    >
                        <div>
                            <ColumnDefinitionStepListItem
                                columnDefinition={colDef}
                                selected={
                                    colDef.idPersistent ==
                                    selectedColumnDefinition.value?.idPersistent
                                }
                                idContributionPersistent={idContributionPersistent}
                                selectCallback={selectCallback}
                            />
                        </div>
                    </Flipped>
                ))}
                {definitions.value?.discardedDefinitionsList.map((colDef) => (
                    <Flipped
                        key={colDef.idPersistent}
                        flipId={colDef.idPersistent}
                        spring={_spring}
                    >
                        <div>
                            <ColumnDefinitionStepListItem
                                columnDefinition={colDef}
                                selected={colDef == selectedColumnDefinition.value}
                                idContributionPersistent={idContributionPersistent}
                                selectCallback={selectCallback}
                            />
                        </div>
                    </Flipped>
                ))}
            </Flipper>
        </ListGroup>
    )
}

export function ColumnDefinitionStepListItem({
    columnDefinition,
    selected,
    idContributionPersistent,
    selectCallback
}: {
    columnDefinition: ColumnDefinitionContribution
    selected: boolean
    idContributionPersistent: string
    selectCallback: (columnDefinition: ColumnDefinitionContribution) => void
}) {
    const dispatch: AppDispatch = useDispatch()
    let itemClassName = ''

    if (selected) {
        itemClassName = 'bg-primary-subtle text-black'
    }
    return (
        <ListGroup.Item
            active={selected}
            onClick={() => selectCallback(columnDefinition)}
            className={itemClassName}
        >
            <Row>
                <Col sm={9} key="column-heading">
                    <Row key="index-in-file">Column {columnDefinition.indexInFile}</Row>
                    <Row key="column-name">
                        <Col xs="auto">
                            <ArrowLeftCircle />
                        </Col>
                        <Col>
                            <span className="d-inline-block text-truncate">
                                {columnDefinition.name}
                            </span>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <ArrowRightCircleFill />
                        </Col>
                        <Col>
                            {!columnDefinition.discard &&
                            columnDefinition.idExistingPersistent !== undefined ? (
                                <ColumnNamePathFromId
                                    idColumnPersistent={
                                        columnDefinition.idExistingPersistent
                                    }
                                />
                            ) : (
                                <div className="fst-italic">Not assigned</div>
                            )}
                        </Col>
                    </Row>
                </Col>
                <Col xs={2} className="align-self-center">
                    <span>Import</span>
                    <FormCheck
                        className="ms-2"
                        type="switch"
                        // value={columnDefinition.idPersistent}
                        checked={!columnDefinition.discard}
                        onChange={(evt) => {
                            evt.stopPropagation()
                            dispatch(
                                patchColumnDefinitionContribution({
                                    idContributionPersistent,
                                    idPersistent: columnDefinition.idPersistent,
                                    discard: !columnDefinition.discard
                                })
                            )
                        }}
                    />
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function ContributionColumnAssignmentForm({
    columnDefinition,
    createTabSelected,
    idContributionPersistent
}: {
    columnDefinition?: ColumnDefinitionContribution
    createTabSelected: boolean
    idContributionPersistent: string
}) {
    const dispatch: AppDispatch = useDispatch()
    if (columnDefinition === undefined) {
        return <span>Please select a column definition.</span>
    }

    return (
        <Row className="h-100 d-flex flex-row">
            <div
                data-testid="existing-column-form"
                className="h-100 d-flex flex-column col-6"
            >
                <div className="ps-2 flex-grow-0 flex-shrink-0 d-block">
                    <span key="hint-note">
                        Please select the column that should receive the data of column
                        "
                    </span>
                    <span key="hint-column-definition">{columnDefinition.name}":</span>
                </div>
                {createTabSelected ? (
                    <div />
                ) : (
                    <ExistingColumnForm
                        columnDefinitionContribution={columnDefinition}
                        key={columnDefinition.idPersistent}
                        idContributionPersistent={idContributionPersistent}
                    />
                )}
                <Row className="ms-3 me-3 flex-grow-0 flex-shrink-0 flex-nowrap">
                    <Button
                        onClick={() => dispatch(setColumnDefinitionFormTab(true))}
                        variant="outline-primary"
                    >
                        Create new column
                    </Button>
                </Row>
            </div>
            <Col xs="6" className="h-90 mb-4">
                <PreviewConnector
                    idContributionPersistent={idContributionPersistent}
                    idColumnPersistent={columnDefinition.idPersistent}
                    idExistingPersistent={columnDefinition.idExistingPersistent}
                />
            </Col>
            <Modal
                show={createTabSelected}
                onHide={() => dispatch(setColumnDefinitionFormTab(false))}
                data-testid="create-column-modal"
                size="lg"
                className="overflow-hidden"
                contentClassName="vh-95 d-flex flex-column bg-secondary flex-sm-wrap flex-md-nowrap"
            >
                <Modal.Header closeButton className="overflow-hidden text-dark">
                    <Modal.Title>Create a new column</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-secondary d-contents">
                    <NewColumnModalBody />
                </Modal.Body>
            </Modal>
            <EditModal />
        </Row>
    )
}

export function ExistingColumnForm({
    columnDefinitionContribution,
    idContributionPersistent
}: {
    columnDefinitionContribution: ColumnDefinitionContribution
    idContributionPersistent: string
}) {
    const dispatch = useAppDispatch()
    function assignColumnCallback(idExistingColumnPersistent: string | undefined) {
        const rsp: { discard?: boolean; idExistingPersistent?: string } = {}
        if (idExistingColumnPersistent === undefined) {
            rsp['discard'] = true
        } else {
            rsp['idExistingPersistent'] = idExistingColumnPersistent
        }
        dispatch(
            patchColumnDefinitionContribution({
                ...rsp,
                idPersistent: columnDefinitionContribution.idPersistent,
                idContributionPersistent
            })
        )
    }
    const columnIsLoading: boolean = useSelector(selectColumnSelectionLoading)
    return (
        <div className="ps-1 pe-1 flex-column d-flex flex-grow-1 overflow-hidden">
            {columnIsLoading ? (
                <CosmaeLoading />
            ) : (
                <ColumnSelector
                    mkTailElement={(columnDefinitionExisting) => {
                        return (
                            <AssignmentStatusButton
                                columnDefinitionExisting={columnDefinitionExisting}
                                columnDefinitionContribution={
                                    columnDefinitionContribution
                                }
                                assignColumnCallback={assignColumnCallback}
                            />
                        )
                    }}
                    additionalEntries={[
                        {
                            idPersistent: 'id_persistent',
                            name: 'Persistent Entity Id'
                        },
                        {
                            idPersistent: 'display_txt',
                            name: 'Display Text'
                        },
                        {
                            idPersistent: 'justification',
                            name: 'Justification'
                        }
                    ]}
                />
            )}
        </div>
    )
}

function AssignmentStatusButton({
    columnDefinitionExisting,
    columnDefinitionContribution,
    assignColumnCallback
}: {
    columnDefinitionExisting: Column
    columnDefinitionContribution: ColumnDefinitionContribution
    assignColumnCallback: (idColumnExistingPersistent: string | undefined) => void
}) {
    const paddingClass = 'pt-1 pb-1 ps-2 pe-2'
    if (
        columnDefinitionContribution.idExistingPersistent ==
        columnDefinitionExisting?.idPersistent
    ) {
        return (
            <Button
                className={paddingClass}
                onClick={() => assignColumnCallback(undefined)}
            >
                Deselect
            </Button>
        )
    }
    return (
        <Button
            variant="outline-primary"
            className="pt-1 pb-1 ps-3 pe-3"
            onClick={() => assignColumnCallback(columnDefinitionExisting.idPersistent)}
        >
            <span>Select</span>
        </Button>
    )
}

export function NewColumnModalBody() {
    const isLoading = useSelector(selectColumnSelectionLoading)
    const additionalEntries = [{ idPersistent: '', name: 'No parent' }]
    if (isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ColumnCreateForm>
            {(columnTypeCreateFormProps: ColumnTypeCreateFormProps) => (
                <ColumnSelector
                    allowEdit={false}
                    additionalEntries={additionalEntries}
                    mkTailElement={(columnDefinition: Column) => (
                        <Form.Check
                            type="radio"
                            name="parent"
                            value={columnDefinition.idPersistent}
                            onChange={(_event) =>
                                columnTypeCreateFormProps.setParent(
                                    columnDefinition.idPersistent,
                                    columnDefinition.namePath
                                )
                            }
                            checked={
                                columnTypeCreateFormProps.selectedParent ==
                                columnDefinition.idPersistent
                            }
                        />
                    )}
                />
            )}
        </ColumnCreateForm>
    )
}

export function CompleteColumnAssignmentButton({
    idContributionPersistent
}: {
    idContributionPersistent: string
}) {
    const dispatch: AppDispatch = useDispatch()
    const finalizeColumnAssignmentState = useSelector(selectFinalizeColumnAssignment)
    const navigate = useNavigate()
    return (
        <CompleteColumnAssignmentButtonInner
            onClick={() =>
                dispatch(finalizeColumnAssignment(idContributionPersistent)).then(
                    (success) => {
                        if (success) {
                            dispatch(loadContributionDetails(idContributionPersistent))
                            navigate(`/contribute/${idContributionPersistent}/entities`)
                        }
                    }
                )
            }
            finalizeColumnAssignmentState={finalizeColumnAssignmentState}
        />
    )
}
function CompleteColumnAssignmentButtonInner({
    onClick,
    finalizeColumnAssignmentState
}: {
    onClick: () => void
    finalizeColumnAssignmentState: RemoteInterface<boolean>
}) {
    return (
        <div>
            <RemoteTriggerButton
                label="Finalize Column Assignment"
                isLoading={finalizeColumnAssignmentState.isLoading}
                onClick={onClick}
            />
        </div>
    )
}

export function PreviewConnector({
    idContributionPersistent,
    idColumnPersistent,
    idExistingPersistent
}: {
    idContributionPersistent: string
    idColumnPersistent: string
    idExistingPersistent: string | undefined
}) {
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (idColumnPersistent !== undefined) {
            dispatch(loadPreview(idContributionPersistent, idColumnPersistent))
        }
    }, [idColumnPersistent, idContributionPersistent, idExistingPersistent])
    return <PreviewComponent />
}

export function PreviewComponent() {
    const preview = useAppSelector(selectPreview)
    if (preview.isLoading) {
        return <CosmaeLoading />
    }
    if (preview.value === undefined) {
        return <div />
    }
    return (
        <Row className="h-90 mb-4">
            <Col xs={6} className="h-100">
                <CosmaeCard
                    className="h-100"
                    header="Values Contributed by You"
                    bodyClassName="h-100 d-flex flex-column"
                >
                    <PreviewColumn values={preview.value.contributedValues} />
                </CosmaeCard>
            </Col>
            <Col xs={6} className="h-100">
                <CosmaeCard
                    className="h-100"
                    header="Values of Existing Column"
                    bodyClassName="h-100 d-flex flex-column"
                >
                    <PreviewColumn values={preview.value.destinationValues} />
                </CosmaeCard>
            </Col>
        </Row>
    )
}

export function PreviewColumn({ values }: { values: string[] }) {
    return (
        <div className="overflow-y-scroll scroll-gutter flex-grow-1 flex-shrink-1">
            <ul className="">
                {values.map((val, idx) => (
                    <li key={idx}>{val}</li>
                ))}
            </ul>
        </div>
    )
}
