import { useLoaderData } from 'react-router-dom'
import {
    PutDuplicateCallback,
    mkCellContentCallback,
    useContributionEntities,
    GridColumWithType
} from './hooks'
import { ContributionStepper } from '../components'
import { RemoteTriggerButton, CosmaeLoading } from '../../util/components/misc'
import {
    Button,
    CloseButton,
    Col,
    ListGroup,
    Modal,
    Overlay,
    Popover,
    ProgressBar,
    Row
} from 'react-bootstrap'
import { useLayoutEffect, useRef } from 'react'
import { EntityWithDuplicates } from './state'
import { ColumnMenuProvider } from '../../column_menu/components/provider'
import { ColumnMenuBody } from '../../column_menu/components/menu'
import { CompactSelection, DataEditor, GridSelection } from '@glideapps/glide-data-grid'

export function EntitiesStep() {
    const idContributionPersistent = useLoaderData() as string
    const {
        getEntityDuplicatesCallback,
        contributionCandidate,
        isLoading,
        showTagDefinitionsMenu,
        tagDefinitionMap,
        entities,
        minLoadingIdx,
        completeEntityAssignment,
        completeEntityAssignmentCallback,
        clearEntityAssignmentErrorCallback,
        isDuplicates,
        putDuplicateCallback,
        columnDefs,
        toggleTagDefinitionsMenuCallback,
        addTagDefinitionCallback
    } = useContributionEntities(idContributionPersistent)
    useLayoutEffect(() => {
        getEntityDuplicatesCallback()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idContributionPersistent])
    const buttonRef = useRef(null)
    const containerRef = useRef(null)
    if (contributionCandidate.value === undefined || isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ColumnMenuProvider>
            <>
                <ContributionStepper
                    selectedIdx={2}
                    id_persistent={idContributionPersistent}
                    step={contributionCandidate.value.step}
                >
                    <Col
                        ref={containerRef}
                        className="h-100 overflow-hidden d-flex flex-column"
                    >
                        <Row>
                            <Col
                                sm="auto"
                                ref={buttonRef}
                                key="entities-step-complete-button"
                            >
                                <RemoteTriggerButton
                                    normalLabel="Merge Assigned Entities"
                                    successLabel="Entities Successfully Merged"
                                    remoteState={completeEntityAssignment}
                                    onClick={completeEntityAssignmentCallback}
                                />
                                {
                                    <Overlay
                                        show={
                                            completeEntityAssignment?.errorMsg !==
                                            undefined
                                        }
                                        target={buttonRef}
                                        container={containerRef}
                                        placement="bottom"
                                    >
                                        <Popover id="finalize-column-assignment-error-popover">
                                            <Popover.Header className="bg-danger text-light">
                                                <Row className="justify-content-between">
                                                    <Col>Error</Col>
                                                    <CloseButton
                                                        variant="white"
                                                        onClick={
                                                            clearEntityAssignmentErrorCallback
                                                        }
                                                    ></CloseButton>
                                                </Row>
                                            </Popover.Header>
                                            <Popover.Body>
                                                <span>
                                                    {completeEntityAssignment?.errorMsg}
                                                </span>
                                            </Popover.Body>
                                        </Popover>
                                    </Overlay>
                                }
                            </Col>
                            <Col key="entities-step-hint">
                                Please check for duplicate values. Select the first Row
                                to indicate that there is no duplicate.
                            </Col>
                            <Col sm="auto" key="entities-step-add-tag-button">
                                <Button onClick={toggleTagDefinitionsMenuCallback}>
                                    Show Additional tag values
                                </Button>
                            </Col>
                        </Row>
                        <Row className="mt-4">
                            <ProgressBar
                                striped
                                animated
                                hidden={minLoadingIdx === undefined}
                                variant="primary"
                                now={Math.round(
                                    (100 * (minLoadingIdx ?? 100)) /
                                        entities.value.length
                                )}
                                label="Loading Duplicate Candidates"
                            />
                        </Row>
                        <Row className="h-100 ms-2 mt-3 overflow-y-scroll">
                            {isDuplicates ? (
                                <ListGroup>
                                    {entities.value
                                        .filter(
                                            (entity) =>
                                                !entity.similarEntities.isLoading
                                        )
                                        .map((entity) => (
                                            <EntitySimilarityItem
                                                entity={entity}
                                                putDuplicateCallback={
                                                    putDuplicateCallback
                                                }
                                                columnDefs={columnDefs}
                                            />
                                        ))}
                                </ListGroup>
                            ) : (
                                <span>There are no duplicates</span>
                            )}
                        </Row>
                    </Col>
                </ContributionStepper>
                <Modal
                    show={showTagDefinitionsMenu}
                    onHide={toggleTagDefinitionsMenuCallback}
                    data-testid="create-column-modal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Create a new tag</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <ColumnMenuBody
                            loadColumnDataCallback={addTagDefinitionCallback}
                            columnIndices={tagDefinitionMap}
                        />
                    </Modal.Body>
                </Modal>
            </>
        </ColumnMenuProvider>
    )
}

export function EntitySimilarityItem({
    entity,
    putDuplicateCallback,
    columnDefs
}: {
    entity: EntityWithDuplicates
    putDuplicateCallback: PutDuplicateCallback
    columnDefs: GridColumWithType[]
}) {
    const { similarEntities, displayTxt, idPersistent } = entity
    if (similarEntities.errorMsg !== undefined) {
        return (
            <ListGroup.Item className="bg-danger">
                <span>{`Could not get duplicates for ${displayTxt}.\n`}</span>
                <span>{`Reason: ${similarEntities.errorMsg}`}</span>
            </ListGroup.Item>
        )
    }
    if (similarEntities.value.length == 0) {
        return <></>
    }
    let selectedRows = CompactSelection.empty()
    if (entity.assignedDuplicate.value === undefined) {
        selectedRows = selectedRows.add(0)
    } else {
        const idx = entity.entityMap.get(entity.assignedDuplicate.value?.idPersistent)
        if (idx !== undefined) {
            selectedRows = selectedRows.add(idx + 1)
        }
    }
    const selection = { rows: selectedRows, columns: CompactSelection.empty() }
    return (
        <ListGroup.Item key={idPersistent} className="mb-1">
            <DataEditor
                rows={entity.similarEntities.value.length + 1}
                getCellContent={mkCellContentCallback(entity, columnDefs)}
                freezeColumns={2}
                columns={columnDefs}
                rowMarkers="checkbox"
                rowSelect="single"
                gridSelection={selection}
                columnSelect="none"
                rangeSelect="none"
                onGridSelectionChange={(selection: GridSelection) => {
                    console.log(selection)
                    if (selection.current !== undefined) {
                        //Select range
                        return
                    }
                    if (selection.columns.length > 0) {
                        // select columns
                        return
                    }
                    if (selection.rows.length > 1) {
                        return
                    }
                    const selected = selection.rows.first()
                    if (selected === undefined || selected == 0) {
                        putDuplicateCallback(entity.idPersistent, undefined)
                    } else {
                        putDuplicateCallback(
                            entity.idPersistent,
                            entity.similarEntities.value[selected - 1].idPersistent
                        )
                    }
                }}
            />
        </ListGroup.Item>
    )
}
