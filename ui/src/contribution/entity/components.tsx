import { useLoaderData } from 'react-router-dom'
import { mkCellContentCallback, GridColumWithType } from './hooks'
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
import { ForwardedRef, forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { EntityWithDuplicates } from './state'
import { ColumnMenuBody } from '../../column_menu/components/menu'
import { DataEditor, GridSelection } from '@glideapps/glide-data-grid'
import { drawCell } from '../../table/draw'
import { CaretLeftFill, CaretRightFill } from 'react-bootstrap-icons'
import { useDispatch, useSelector } from 'react-redux'
import {
    selectColumnDefs,
    selectCompleteEntityAssignment,
    selectEntities,
    selectEntitiesWithMatches,
    selectIsDuplicates,
    selectIsLoading,
    selectLoadingProgress,
    selectMaxPageNumber,
    selectPageNumber,
    selectShowTagDefinitionsMenu,
    selectTagDefinitions
} from './selectors'
import {
    completeEntityAssignment,
    getContributionEntitiesAction,
    getContributionEntityDuplicateCandidatesAction,
    getContributionTagInstances,
    putDuplicateAction
} from './thunks'
import { AppDispatch } from '../../store'
import {
    completeEntityAssignmentClearError,
    setPageNumber,
    toggleTagDefinitionMenu
} from './slice'
import { loadContributionDetails } from '../thunks'
import { selectContribution } from '../selectors'
import { clearSelectedContribution } from '../slice'
import { loadTagDefinitionHierarchy } from '../../column_menu/thunks'
import { selectTagSelectionLoading } from '../../column_menu/selectors'

export function EntitiesStep() {
    const idContributionPersistent = useLoaderData() as string
    const dispatch: AppDispatch = useDispatch()
    const isLoading = useSelector(selectIsLoading)
    const [_tagDefinitions, tagDefinitionMap] = useSelector(selectTagDefinitions)
    const entities = useSelector(selectEntitiesWithMatches)
    const contributionCandidate = useSelector(selectContribution)
    const loadingProgress = useSelector(selectLoadingProgress)
    const columnDefs = useSelector(selectColumnDefs)
    const isDuplicates = useSelector(selectIsDuplicates)
    const pageNumber = useSelector(selectPageNumber)
    const isLoadingTag = useSelector(selectTagSelectionLoading)
    const putDuplicateCallback = (
        idEntityOriginPersistent: string,
        idEntityDestinationPersistent?: string
    ) => {
        dispatch(
            putDuplicateAction({
                idContributionPersistent,
                idEntityOriginPersistent,
                idEntityDestinationPersistent
            })
        )
    }
    useLayoutEffect(() => {
        if (!isLoading) {
            dispatch(loadContributionDetails(idContributionPersistent))
                .then(
                    async () =>
                        await dispatch(
                            getContributionEntitiesAction(idContributionPersistent)
                        )
                )
                .then(async (entities) => {
                    if (!isLoadingTag) {
                        await dispatch(loadTagDefinitionHierarchy({}))
                    }
                    return entities
                })
                .then(async (entities) => {
                    await dispatch(
                        getContributionEntityDuplicateCandidatesAction({
                            idContributionPersistent,
                            entityIdPersistentList: entities.map(
                                (entity) => entity.idPersistent
                            )
                        })
                    )
                })
        }
        return function cleanup() {
            dispatch(clearSelectedContribution())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idContributionPersistent])
    const containerRef = useRef(null)
    if (contributionCandidate.value === undefined || isLoading) {
        return <CosmaeLoading />
    }
    return (
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
                        <CompleteAssignmentButton
                            idContributionPersistent={idContributionPersistent}
                            ref={containerRef}
                        />
                        <PageSelect
                            setPage={(pageNumber) =>
                                setPage(dispatch, entities.value, pageNumber)
                            }
                        />
                        <Col sm="auto" key="entities-step-add-tag-button">
                            <Button onClick={() => dispatch(toggleTagDefinitionMenu())}>
                                Show Additional Tag Values
                            </Button>
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <ProgressBar
                            striped
                            animated
                            hidden={loadingProgress === undefined}
                            variant="primary"
                            now={loadingProgress}
                            label="Loading Duplicate Candidates"
                        />
                    </Row>
                    <Row className="h-100 ms-2 mt-3 overflow-y-scroll">
                        {isDuplicates ? (
                            <ListGroup>
                                {entities.value
                                    .slice(50 * (pageNumber - 1), 50 * pageNumber)
                                    .map((entity) => (
                                        <EntitySimilarityItem
                                            entity={entity}
                                            putDuplicateCallback={putDuplicateCallback}
                                            columnDefs={columnDefs}
                                            key={entity.idPersistent}
                                        />
                                    ))}
                            </ListGroup>
                        ) : (
                            <span>There are no duplicates</span>
                        )}
                    </Row>
                </Col>
            </ContributionStepper>
            <AddTagDefinitionsModal
                tagDefinitionMap={tagDefinitionMap}
                idContributionPersistent={idContributionPersistent}
            />
        </>
    )
}

function AddTagDefinitionsModal({
    idContributionPersistent,
    tagDefinitionMap
}: {
    idContributionPersistent: string
    tagDefinitionMap: Map<string, number>
}) {
    const dispatch: AppDispatch = useDispatch()
    const showTagDefinitionsMenu = useSelector(selectShowTagDefinitionsMenu)
    const entities = useSelector(selectEntities)
    return (
        <Modal
            show={showTagDefinitionsMenu}
            onHide={() => dispatch(toggleTagDefinitionMenu())}
            data-testid="create-column-modal"
            key="entities-step-modal"
        >
            <Modal.Header closeButton>
                <Modal.Title>Create a new tag</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ColumnMenuBody
                    loadColumnDataCallback={(tagDef) => {
                        const chunkSize = 50
                        for (
                            let startIdx = 0;
                            startIdx < entities.value.length;
                            startIdx += chunkSize
                        ) {
                            if (entities.isLoading) {
                                return
                            }
                            const endIdx = Math.min(
                                entities.value.length,
                                startIdx + chunkSize
                            )
                            const entitiesSlice = entities.value.slice(startIdx, endIdx)
                            const entitiesMap: { [key: string]: string[] } = {}
                            for (const entity of entitiesSlice) {
                                if (entity.similarEntities.isLoading) {
                                    return
                                }
                                entitiesMap[entity.idPersistent] = [
                                    entity.idPersistent,
                                    ...new Set(
                                        entity.similarEntities.value.map(
                                            (entity) => entity.idPersistent
                                        )
                                    )
                                ]
                            }
                            dispatch(
                                getContributionTagInstances({
                                    entitiesGroupMap: entitiesMap,
                                    tagDefinitionList: [tagDef],
                                    idContributionPersistent: idContributionPersistent
                                })
                            )
                        }
                    }}
                    columnIndices={tagDefinitionMap}
                />
            </Modal.Body>
        </Modal>
    )
}

function PageSelect({ setPage }: { setPage: (pageNumber: number) => void }) {
    const pageNumber = useSelector(selectPageNumber)
    const pageNumberMax = useSelector(selectMaxPageNumber)
    const [pageNumberForm, setPageNumberForm] = useState(pageNumber.toString())
    return (
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
                    data-testid="page-prev"
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
                                    setPageNumberForm(event.target.value)
                                    const parsed = Number.parseInt(event.target.value)
                                    if (parsed === undefined || isNaN(parsed)) {
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
                            setPageNumberForm(newPageNumber.toString())
                            setPage(newPageNumber)
                        }
                    }}
                    data-testid="page-next"
                >
                    <CaretRightFill />
                </Col>
            </Row>
        </Col>
    )
}

export function EntitySimilarityItem({
    entity,
    putDuplicateCallback,
    columnDefs
}: {
    entity: EntityWithDuplicates
    putDuplicateCallback: (
        idEntityOriginPersistent: string,
        idEntityDestinationPersistent?: string
    ) => void
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

export const CompleteAssignmentButton = forwardRef(
    (
        { idContributionPersistent }: { idContributionPersistent: string },
        containerRef: ForwardedRef<HTMLElement>
    ) => {
        const buttonRef = useRef(null)
        const completeEntityAssignmentState = useSelector(
            selectCompleteEntityAssignment
        )
        const dispatch: AppDispatch = useDispatch()
        return (
            <>
                <Col sm="auto" ref={buttonRef} key="entities-step-complete-button">
                    <RemoteTriggerButton
                        normalLabel="Confirm Assigned Duplicates"
                        successLabel="Duplicates Successfully Assigned"
                        remoteState={completeEntityAssignmentState}
                        onClick={() =>
                            dispatch(completeEntityAssignment(idContributionPersistent))
                        }
                    />
                </Col>
                <Overlay
                    show={completeEntityAssignmentState?.errorMsg !== undefined}
                    target={buttonRef.current}
                    placement="bottom"
                    ref={containerRef}
                >
                    <Popover id="finalize-column-assignment-error-popover">
                        <Popover.Header className="bg-danger text-light">
                            <Row className="justify-content-between">
                                <Col>Error</Col>
                                <CloseButton
                                    variant="white"
                                    onClick={() =>
                                        dispatch(completeEntityAssignmentClearError())
                                    }
                                ></CloseButton>
                            </Row>
                        </Popover.Header>
                        <Popover.Body>
                            <span>{completeEntityAssignmentState?.errorMsg}</span>
                        </Popover.Body>
                    </Popover>
                </Overlay>
            </>
        )
    }
)

function setPage(
    dispatch: AppDispatch,
    entities: EntityWithDuplicates[],
    pageNumber: number
) {
    const validPageNumber = Math.min(
        Math.max(1, pageNumber),
        Math.ceil(entities.length / 50)
    )
    dispatch(setPageNumber(validPageNumber))
}
