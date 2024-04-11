import { Button, Col, Form, FormCheck, ListGroup, Modal, Row } from 'react-bootstrap'
import { ColumnDefinitionContribution } from './state'
import { ChangeEvent, useEffect } from 'react'
import { ColumnSelector, EditModal } from '../../column_menu/components/selection'
import { RemoteTriggerButton, CosmaeLoading } from '../../util/components/misc'
import { TagDefinition } from '../../column_menu/state'
import {
    TagCreateForm,
    ColumnTypeCreateFormProps
} from '../../column_menu/components/form'
import { useDispatch, useSelector } from 'react-redux'
import {
    finalizeColumnAssignment,
    loadColumnDefinitionsContribution,
    patchColumnDefinitionContribution
} from './thunks'
import { AppDispatch } from '../../store'
import { columnDefinitionContributionSelect, setColumnDefinitionFormTab } from './slice'
import {
    selectColumnDefinitionsContributionTriple,
    selectCreateTabSelected,
    selectFinalizeColumnAssignment,
    selectSelectedColumnDefinition
} from './selectors'
import { selectTagSelectionLoading } from '../../column_menu/selectors'
import { loadTagDefinitionHierarchy } from '../../column_menu/thunks'
import { RemoteInterface } from '../../util/state'
import { selectContribution } from '../selectors'
import { useNavigate } from 'react-router-dom'
import { loadContributionDetails } from '../thunks'
import { useAppSelector } from '../../hooks'

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

function ContributionColumnsList({
    idContributionPersistent
}: {
    idContributionPersistent: string
}) {
    const definitions = useAppSelector(selectColumnDefinitionsContributionTriple)
    const selectedColumnDefinition = useAppSelector(selectSelectedColumnDefinition)
    return (
        <ListGroup>
            {definitions.value?.activeDefinitionsList.map((colDef) => (
                <ColumnDefinitionStepListItem
                    columnDefinition={colDef}
                    selected={colDef == selectedColumnDefinition.value}
                    idContributionPersistent={idContributionPersistent}
                    key={colDef.idPersistent}
                />
            ))}
            {definitions.value?.discardedDefinitionsList.map((colDef) => (
                <ColumnDefinitionStepListItem
                    columnDefinition={colDef}
                    selected={colDef == selectedColumnDefinition.value}
                    idContributionPersistent={idContributionPersistent}
                    key={colDef.idPersistent + colDef.discard.toString()}
                />
            ))}
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
            <Col xs="6">Preview not implemented yet</Col>
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
    const dispatch: AppDispatch = useDispatch()
    const tagIsLoading = useSelector(selectTagSelectionLoading)
    return (
        <div className="ps-1 pe-1 flex-column d-flex flex-grow-1 overflow-hidden">
            {tagIsLoading ? (
                <CosmaeLoading />
            ) : (
                <ColumnSelector
                    mkTailElement={(columnDefinitionExisting) => (
                        <Form.Check
                            type="radio"
                            name="idExisting"
                            value={columnDefinitionExisting?.idPersistent}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                dispatch(
                                    patchColumnDefinitionContribution({
                                        idPersistent:
                                            columnDefinitionContribution.idPersistent,
                                        idContributionPersistent,
                                        idExistingPersistent: event.target.value
                                    })
                                )
                            }
                            checked={
                                columnDefinitionContribution.idExistingPersistent ==
                                columnDefinitionExisting?.idPersistent
                            }
                        />
                    )}
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
