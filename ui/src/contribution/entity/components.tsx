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
    Form,
    ListGroup,
    Modal,
    Overlay,
    Popover,
    ProgressBar,
    Row
} from 'react-bootstrap'
import { useLayoutEffect, useRef, useState } from 'react'
import { EntityWithDuplicates } from './state'
import { ColumnMenuProvider } from '../../column_menu/components/provider'
import { ColumnMenuBody } from '../../column_menu/components/menu'
import { DataEditor, GridSelection } from '@glideapps/glide-data-grid'
import { drawCell } from '../../table/draw'
import { CaretLeftFill, CaretRightFill } from 'react-bootstrap-icons'

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
        addTagDefinitionCallback,
        pageNumber,
        pageNumberMax,
        setPage
    } = useContributionEntities(idContributionPersistent)
    useLayoutEffect(() => {
        getEntityDuplicatesCallback()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idContributionPersistent])
    const buttonRef = useRef(null)
    const containerRef = useRef(null)
    const [pageNumberForm, setPageNumberForm] = useState(pageNumber.toString())
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
                        <Row key="entities-step-hint" className="ms-0">
                            Please check for duplicate entities. Select the first Row to
                            indicate that there is no duplicate.
                        </Row>
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
                            <Col>
                                <Row className="justify-content-center align-items-center">
                                    <Col
                                        xs="auto"
                                        onClick={() => {
                                            const newPage = pageNumber - 1
                                            if (newPage > 0) {
                                                setPageNumberForm(newPage.toString())
                                                setPage(newPage)
                                            }
                                        }}
                                    >
                                        <CaretLeftFill />
                                    </Col>
                                    <Col xs="auto">
                                        <Row xs="auto" className="align-items-center">
                                            <Col xs="auto" className="ps-0">
                                                Page
                                            </Col>
                                            <Col xs="auto" className="ps-0 pe-0">
                                                <Form.Control
                                                    htmlSize={1}
                                                    value={pageNumberForm}
                                                    onChange={(event) => {
                                                        setPageNumberForm(
                                                            event.target.value
                                                        )
                                                        const parsed = Number.parseInt(
                                                            event.target.value
                                                        )
                                                        if (
                                                            parsed === undefined ||
                                                            isNaN(parsed)
                                                        ) {
                                                            return
                                                        }
                                                        setPage(parsed)
                                                    }}
                                                />
                                            </Col>
                                            <Col xs="auto" className="ps-1 pe-0">
                                                {'/ ' + pageNumberMax}
                                            </Col>
                                        </Row>
                                    </Col>
                                    <Col
                                        xs="auto"
                                        onClick={() => {
                                            const newPageNumber = pageNumber + 1
                                            if (newPageNumber <= pageNumberMax) {
                                                setPageNumberForm(
                                                    newPageNumber.toString()
                                                )
                                                setPage(newPageNumber)
                                            }
                                        }}
                                    >
                                        <CaretRightFill />
                                    </Col>
                                </Row>
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
                    key="entities-step-modal"
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
            <ListGroup.Item className="bg-danger" key={idPersistent}>
                <span key="span-0">{`Could not get duplicates for ${displayTxt}.\n`}</span>
                <span key="span-1">{`Reason: ${similarEntities.errorMsg}`}</span>
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
