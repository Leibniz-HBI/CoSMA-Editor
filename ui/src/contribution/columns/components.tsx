import { Button, Col, Form, FormCheck, ListGroup, Modal, Row } from 'react-bootstrap'
import { ColumnDefinitionContribution } from './state'
import { useEffect } from 'react'
import { ColumnSelector, EditModal } from '../../column_menu/components/selection'
import {
    RemoteTriggerButton,
    CosmaeLoading,
    CosmaeCard
} from '../../util/components/misc'
import { TagDefinition } from '../../column_menu/state'
import {
    TagCreateForm,
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
import { columnDefinitionContributionSelect, setColumnDefinitionFormTab } from './slice'
import {
    selectColumnDefinitionsContributionTriple,
    selectCreateTabSelected,
    selectFinalizeColumnAssignment,
    selectPreview,
    selectSelectedColumnDefinition
} from './selectors'
import { selectTagSelectionLoading } from '../../column_menu/selectors'
import { loadTagDefinitionHierarchy } from '../../column_menu/thunks'
import { RemoteInterface } from '../../util/state'
import { selectContribution } from '../selectors'
import { useNavigate } from 'react-router-dom'
import { loadContributionDetails } from '../thunks'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { Flipped, Flipper } from 'react-flip-toolkit'

export function ColumnDefinitionStep() {
    const dispatch: AppDispatch = useDispatch()
    const definitions = useSelector(selectColumnDefinitionsContributionTriple)
    const selectedColumnDefinition = useSelector(selectSelectedColumnDefinition)
    const createTabSelected = useSelector(selectCreateTabSelected)
    const isLoadingTags = useSelector(selectTagSelectionLoading)
    const contributionCandidate = useSelector(selectContribution)
    useEffect(() => {
        if (contributionCandidate.value != undefined && !definitions.isLoading) {
            dispatch(
                loadColumnDefinitionsContribution(
                    contributionCandidate.value.idPersistent
                )
            ).then(async () => {
                if (!isLoadingTags) {
                    await dispatch(loadTagDefinitionHierarchy({ expand: true }))
                }
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contributionCandidate.value?.idPersistent])
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
                <Row className="flex-grow-1 overflow-y-scroll mb-3">
                    <ContributionColumnsList
                        idContributionPersistent={idContributionPersistent}
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
    idContributionPersistent
}: {
    idContributionPersistent: string
}) {
    const definitions = useAppSelector(selectColumnDefinitionsContributionTriple)
    const selectedColumnDefinition = useAppSelector(selectSelectedColumnDefinition)
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
                                selected={colDef == selectedColumnDefinition.value}
                                idContributionPersistent={idContributionPersistent}
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
    idContributionPersistent
}: {
    columnDefinition: ColumnDefinitionContribution
    selected: boolean
    idContributionPersistent: string
}) {
    const dispatch: AppDispatch = useDispatch()
    let itemClassName = ''

    if (selected) {
        itemClassName = 'bg-primary-subtle text-black'
    }
    return (
        <ListGroup.Item
            active={selected}
            onClick={() =>
                dispatch(columnDefinitionContributionSelect(columnDefinition))
            }
            className={itemClassName}
        >
            <Row>
                <Col sm={9} key="column-heading">
                    <Row key="index-in-file">Column {columnDefinition.indexInFile}</Row>
                    <Row key="column-name">
                        <span className="d-inline-block text-truncate">
                            {columnDefinition.name}
                        </span>
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
                        Please select the tag that should receive the data of column "
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
                        Create new tag
                    </Button>
                </Row>
            </div>
            <Col xs="6">
                <PreviewConnector
                    idContributionPersistent={idContributionPersistent}
                    idColumnPersistent={columnDefinition.idPersistent}
                />
            </Col>
            <Modal
                show={createTabSelected}
                onHide={() => dispatch(setColumnDefinitionFormTab(false))}
                data-testid="create-column-modal"
                size="lg"
                className="overflow-hidden text-dark"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Create a new tag</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light vh-85">
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
    function assignColumnCallback(idExistingTagDefPersistent: string) {
        dispatch(
            patchColumnDefinitionContribution({
                idPersistent: columnDefinitionContribution.idPersistent,
                idContributionPersistent,
                idExistingPersistent: idExistingTagDefPersistent
            })
        )
    }
    const tagIsLoading: boolean = useSelector(selectTagSelectionLoading)
    return (
        <div className="ps-1 pe-1 flex-column d-flex flex-grow-1 overflow-hidden">
            {tagIsLoading ? (
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
    columnDefinitionExisting: TagDefinition
    columnDefinitionContribution: ColumnDefinitionContribution
    assignColumnCallback: (idTagDefinitionExistingPersistent: string) => void
}) {
    const paddingClass = 'pt-1 pb-1 ps-2 pe-2'
    if (
        columnDefinitionContribution.idExistingPersistent ==
        columnDefinitionExisting?.idPersistent
    ) {
        return <Button className={paddingClass}>Selected</Button>
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
    const isLoading = useSelector(selectTagSelectionLoading)
    const additionalEntries = [{ idPersistent: '', name: 'No parent' }]
    if (isLoading) {
        return <CosmaeLoading />
    }
    return (
        <TagCreateForm>
            {(columnTypeCreateFormProps: ColumnTypeCreateFormProps) => (
                <ColumnSelector
                    allowEdit={false}
                    additionalEntries={additionalEntries}
                    mkTailElement={(columnDefinition: TagDefinition) => (
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
        </TagCreateForm>
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
    idColumnPersistent
}: {
    idContributionPersistent: string
    idColumnPersistent: string
}) {
    const dispatch = useAppDispatch()
    useEffect(
        () => {
            if (idColumnPersistent !== undefined) {
                dispatch(loadPreview(idContributionPersistent, idColumnPersistent))
            }
        },
        //eslint-disable-next-line react-hooks/exhaustive-deps
        [idColumnPersistent, idContributionPersistent]
    )
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
        <Row>
            <Col xs={6}>
                <CosmaeCard header="Values Contributed by You">
                    <PreviewColumn values={preview.value.contributedValues} />
                </CosmaeCard>
            </Col>
            <Col xs={6}>
                <CosmaeCard header="Values of Existing Tag">
                    <PreviewColumn values={preview.value.destinationValues} />
                </CosmaeCard>
            </Col>
        </Row>
    )
}

export function PreviewColumn({ values }: { values: string[] }) {
    return (
        <ul>
            {values.map((val, idx) => (
                <li key={idx}>{val}</li>
            ))}
        </ul>
    )
}
