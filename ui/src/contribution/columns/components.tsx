import { useLoaderData } from 'react-router-dom'
import { useColumnDefinitionsContribution } from './hooks'
import { ContributionStepper } from '../components'
import { Button, Col, Form, ListGroup, Modal, Row } from 'react-bootstrap'
import { ColumnDefinitionContribution } from './state'
import { Trash } from 'react-bootstrap-icons'
import { ChangeEvent, useLayoutEffect } from 'react'
import { ColumnSelector, mkListItems } from '../../column_menu/components/selection'
import { CosmaeLoading } from '../../util/components/misc'
import { ColumnDefinition } from '../../column_menu/state'
import {
    ColumnTypeCreateForm,
    ColumnTypeCreateFormProps
} from '../../column_menu/components/form'
import { ColumnHierarchyContext } from '../../column_menu/hooks'
import { ColumnMenuProvider } from '../../column_menu/components/provider'

export function ColumnDefinitionStep() {
    const idContributionPersistent = useLoaderData() as string
    const {
        loadColumnDefinitionsContributionCallback,
        selectColumnDefinitionContributionCallback,
        selectColumnCreationTabCallback,
        setExistingCallback,
        discardCallback,
        definitions,
        selectedColumnDefinition,
        createTabSelected
    } = useColumnDefinitionsContribution(idContributionPersistent)
    useLayoutEffect(() => {
        loadColumnDefinitionsContributionCallback()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idContributionPersistent])
    if (definitions.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ContributionStepper
            selectedIdx={1}
            id_persistent={idContributionPersistent}
            step={definitions.value?.contributionCandidate.step}
        >
            <ColumnMenuProvider>
                <Row className="overflow-hidden h-100">
                    <Col
                        sm={2}
                        className="h-100 overflow-y-scroll"
                        key="column-definition-selection"
                    >
                        <Row className="text-primary">
                            <span>Columns extracted from upload:</span>
                        </Row>
                        <Row>
                            <ListGroup>
                                {definitions.value?.activeDefinitionsList.map(
                                    (colDef) => (
                                        <ColumnDefinitionStepListItem
                                            columnDefinition={colDef}
                                            selected={
                                                colDef == selectedColumnDefinition.value
                                            }
                                            onClick={() =>
                                                selectColumnDefinitionContributionCallback(
                                                    colDef
                                                )
                                            }
                                            discardCallback={discardCallback}
                                            key={colDef.idPersistent}
                                        />
                                    )
                                )}
                                {definitions.value?.discardedDefinitionsList.map(
                                    (colDef) => (
                                        <ColumnDefinitionStepListItem
                                            columnDefinition={colDef}
                                            selected={
                                                colDef == selectedColumnDefinition.value
                                            }
                                            onClick={() =>
                                                selectColumnDefinitionContributionCallback(
                                                    colDef
                                                )
                                            }
                                            discardCallback={discardCallback}
                                            key={
                                                colDef.idPersistent +
                                                colDef.discard.toString()
                                            }
                                        />
                                    )
                                )}
                            </ListGroup>
                        </Row>
                    </Col>
                    <Col
                        key="column-definition-assignment-form"
                        className="ps-0 pe-0"
                        data-testid="column-assignment-form-column"
                    >
                        <ContributionColumnAssignmentForm
                            columnDefinition={selectedColumnDefinition.value}
                            createTabSelected={createTabSelected}
                            selectColumnCreationTabCallback={
                                selectColumnCreationTabCallback
                            }
                            setExistingCallback={setExistingCallback}
                        />
                    </Col>
                </Row>
            </ColumnMenuProvider>
        </ContributionStepper>
    )
}

export function ColumnDefinitionStepListItem({
    columnDefinition,
    selected,
    onClick,
    discardCallback
}: {
    columnDefinition: ColumnDefinitionContribution
    selected: boolean
    onClick: VoidFunction
    discardCallback: (idPersistent: string, discard: boolean) => void
}) {
    let buttonText = ''
    let buttonVariant = 'primary'

    if (selected) {
        if (columnDefinition.discard) {
            buttonVariant = 'outline-secondary'
        } else {
            buttonVariant = 'secondary'
            buttonText = 'text-primary'
        }
    } else {
        if (columnDefinition.discard) {
            buttonVariant = 'primary'
            buttonText = 'text-secondary'
        } else {
            buttonVariant = 'outline-primary'
        }
    }
    const buttonClass = buttonText
    return (
        <ListGroup.Item active={selected} onClick={onClick}>
            <Row>
                <Col sm={9} key="column-heading">
                    <Row key="index-in-file">Column {columnDefinition.indexInFile}</Row>
                    <Row key="column-name">
                        <span className="d-inline-block text-truncate">
                            {columnDefinition.name}
                        </span>
                    </Row>
                </Col>
                <Col sm="auto">
                    <Button
                        variant={buttonVariant}
                        key="discard-button"
                        className={buttonClass}
                        onClick={(evt) => {
                            evt.stopPropagation()
                            discardCallback(
                                columnDefinition.idPersistent,
                                !columnDefinition.discard
                            )
                        }}
                    >
                        <Trash />
                    </Button>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function ContributionColumnAssignmentForm({
    columnDefinition,
    createTabSelected,
    selectColumnCreationTabCallback,
    setExistingCallback
}: {
    columnDefinition?: ColumnDefinitionContribution
    createTabSelected: boolean
    selectColumnCreationTabCallback: (selectColumnCreationTab: boolean) => void
    setExistingCallback: (idPersistent: string) => void
}) {
    if (columnDefinition === undefined) {
        return <span>Please select a column definition.</span>
    }

    return (
        <Row>
            <Col sm="6">
                <Row data-testid="existing-column-form">
                    {createTabSelected ? (
                        <div />
                    ) : (
                        <ExistingColumnForm
                            columnDefinitionContribution={columnDefinition}
                            setExistingCallback={setExistingCallback}
                            key={columnDefinition.idPersistent}
                        />
                    )}
                </Row>
                <Row className="ms-0 me-0">
                    <Button
                        onClick={() => selectColumnCreationTabCallback(true)}
                        variant="outline-primary"
                    >
                        Create new column
                    </Button>
                </Row>
            </Col>
            <Col sm="6">Preview not implemented yet</Col>
            <Modal
                show={createTabSelected}
                onHide={() => selectColumnCreationTabCallback(false)}
                data-testid="create-column-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Create a new column</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <NewColumnModalBody />
                </Modal.Body>
            </Modal>
        </Row>
    )
}

export function ExistingColumnForm({
    columnDefinitionContribution,
    setExistingCallback
}: {
    columnDefinitionContribution: ColumnDefinitionContribution
    setExistingCallback: (inputEvent: string) => void
}) {
    return (
        <Col>
            <Row className="ps-2">
                <span>Please select an existing column.</span>
            </Row>
            <Row className="ps-1 pe-1">
                <ColumnHierarchyContext.Consumer>
                    {(columnMenuData) => {
                        if (columnMenuData === undefined) {
                            return <CosmaeLoading />
                        }
                        return (
                            <ColumnSelector
                                listEntries={mkListItems({
                                    columnSelectionEntries:
                                        columnMenuData.navigationEntries,
                                    path: [],
                                    level: 0,
                                    additionalEntries: [
                                        {
                                            idPersistent: 'id_persistent',
                                            name: 'Persistent Entity Id'
                                        },
                                        {
                                            idPersistent: 'display_txt',
                                            name: 'Display Text'
                                        }
                                    ],
                                    toggleExpansionCallback:
                                        columnMenuData.toggleExpansionCallback,
                                    mkTailElement: (columnDefinitionExisting) => (
                                        <Form.Check
                                            type="radio"
                                            name="idExisting"
                                            value={
                                                columnDefinitionExisting?.idPersistent
                                            }
                                            onChange={(
                                                event: ChangeEvent<HTMLInputElement>
                                            ) =>
                                                setExistingCallback(event.target.value)
                                            }
                                            checked={
                                                columnDefinitionContribution.idExistingPersistent ==
                                                columnDefinitionExisting?.idPersistent
                                            }
                                        />
                                    )
                                })}
                            />
                        )
                    }}
                </ColumnHierarchyContext.Consumer>
            </Row>
        </Col>
    )
}

export function NewColumnModalBody() {
    const additionalEntries = [{ idPersistent: '', name: 'No parent' }]
    return (
        <ColumnHierarchyContext.Consumer>
            {(remoteColumnMenuData) => {
                if (remoteColumnMenuData === undefined) {
                    return <CosmaeLoading />
                }
                return (
                    <ColumnTypeCreateForm
                        submitColumnDefinitionCallback={
                            remoteColumnMenuData.submitColumnDefinitionCallback
                        }
                        submitError={remoteColumnMenuData.submitColumnError}
                        clearError={
                            remoteColumnMenuData.submitColumnDefinitionClearErrorCallback
                        }
                    >
                        {(columnTypeCreateFormProps: ColumnTypeCreateFormProps) => (
                            <ColumnSelector
                                listEntries={mkListItems({
                                    columnSelectionEntries:
                                        remoteColumnMenuData.navigationEntries,
                                    path: [],
                                    toggleExpansionCallback:
                                        remoteColumnMenuData.toggleExpansionCallback,
                                    level: 0,
                                    additionalEntries: additionalEntries,
                                    mkTailElement: (
                                        columnDefinition: ColumnDefinition
                                    ) => (
                                        <Form.Check
                                            type="radio"
                                            name="parent"
                                            value={columnDefinition.idPersistent}
                                            onChange={
                                                columnTypeCreateFormProps.handleChange
                                            }
                                            checked={
                                                columnTypeCreateFormProps.selectedParent ==
                                                columnDefinition.idPersistent
                                            }
                                        />
                                    )
                                })}
                            />
                        )}
                    </ColumnTypeCreateForm>
                )
            }}
        </ColumnHierarchyContext.Consumer>
    )
}
