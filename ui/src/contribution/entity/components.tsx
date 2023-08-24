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
import { DataEditor, GridSelection } from '@glideapps/glide-data-grid'
import { drawCell } from '../../table/draw'

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
                                    normalLabel="Confirm Assigned Duplicates"
                                    successLabel="Duplicates Successfully Assigned"
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
                                Please check for duplicate entities. Select the first
                                Row to indicate that there is no duplicate.
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
                                minLoadingIdx === undefined && (
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
                                )
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
    return (
        <ListGroup.Item key={idPersistent} className="mb-1">
            <DataEditor
                drawCell={drawCell}
                rows={entity.similarEntities.value.length + 1}
                getCellContent={mkCellContentCallback(entity, columnDefs)}
                freezeColumns={3}
                columns={columnDefs}
                rowSelect="none"
                columnSelect="none"
                rangeSelect="cell"
                onGridSelectionChange={(selection: GridSelection) => {
                    const current = selection.current
                    if (current !== undefined) {
                        //Select range
                        const [colIdx, rowIdx] = current.cell
                        if (colIdx != 0) {
                            return
                        }
                        if (rowIdx === undefined || rowIdx == 0) {
                            putDuplicateCallback(entity.idPersistent, undefined)
                        } else {
                            putDuplicateCallback(
                                entity.idPersistent,
                                entity.similarEntities.value[rowIdx - 1].idPersistent
                            )
                        }
                    }
                }}
            />
        </ListGroup.Item>
    )
}
