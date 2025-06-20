import { constructColumnTitle, mkCellContentCallback } from './hooks'
import { CosmaeLoading } from '../../util/components/misc'
import { Button, Col, ListGroup, Row } from 'react-bootstrap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EntityWithDuplicates } from './state'
import {
    DataEditor,
    GridMouseEventArgs,
    GridSelection
} from '@glideapps/glide-data-grid'
import { loadingCellRenderer, ReplaceButtonCellRenderer } from '../../table/draw'
import { useDispatch, useSelector } from 'react-redux'
import {
    selectEntityColumnDefs,
    selectEntitiesWithMatches,
    selectIsLoading,
    selectSelectedEntity,
    selectColumns,
    selectMatchColumnList,
    selectColumnRowDefs
} from './selectors'
import {
    getAdditionalEntityScoreThunk,
    getContributionEntitiesAction,
    getContributionEntityDuplicateCandidatesAction,
    getContributionValues,
    putDuplicateAction
} from './thunks'
import { AppDispatch } from '../../store'
import {
    incrementSelectedEntityIdx,
    openJustificationInput,
    setColumnWidth,
    setSelectedEntityIdx,
    toggleColumnMenu
} from './slice'
import { selectContribution, selectContributionJustification } from '../selectors'
import { loadColumnHierarchy } from '../../column_menu/thunks'
import { IBounds, useLayer } from 'react-laag'
import { Column } from '../../column_menu/state'
import {
    AddColumnsModal,
    JustificationModal,
    LastMatchModal
} from './components/modals'
import {
    CompleteAssignmentButton,
    ChangeJustificationButton
} from './components/buttons'
import { useAppSelector } from '../../hooks'
import { EntitySearch } from '../../entity/components'

export function EntitiesStep() {
    const contributionCandidate = useSelector(selectContribution)
    if (contributionCandidate.value === undefined) {
        return <CosmaeLoading />
    }
    return (
        <EntitiesStepBody
            idContributionPersistent={contributionCandidate.value.idPersistent}
        />
    )
}

export type PutDuplicateCallback = ({
    idEntityOriginPersistent,
    idEntityDestinationPersistent,
    justificationTxt,
    keepJustificationForAll,
    onSuccess
}: {
    idEntityOriginPersistent: string
    idEntityDestinationPersistent?: string
    justificationTxt?: string | undefined
    keepJustificationForAll?: boolean | undefined
    onSuccess?: VoidFunction | undefined
}) => Promise<boolean>

export function EntitiesStepBody({
    idContributionPersistent
}: {
    idContributionPersistent: string
}) {
    const dispatch: AppDispatch = useDispatch()
    useEffect(() => {
        dispatch(getContributionEntitiesAction(idContributionPersistent))
            .then(async (entities) => {
                dispatch(loadColumnHierarchy({}))
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
    }, [dispatch, idContributionPersistent])
    const contributionJustification = useAppSelector(selectContributionJustification)
    const entities = useSelector(selectEntitiesWithMatches)
    const isLoading = useSelector(selectIsLoading)
    const putDuplicateCallback = async ({
        idEntityOriginPersistent,
        idEntityDestinationPersistent,
        justificationTxt = undefined,
        keepJustificationForAll = undefined,
        onSuccess = undefined
    }: {
        idEntityOriginPersistent: string
        idEntityDestinationPersistent?: string
        justificationTxt?: string | undefined
        keepJustificationForAll?: boolean | undefined
        onSuccess?: VoidFunction | undefined
    }) => {
        const result = await dispatch(
            putDuplicateAction({
                idContributionPersistent,
                idEntityOriginPersistent,
                idEntityDestinationPersistent,
                justificationTxt,
                keepJustificationForAll
            })
        )
        if (result) {
            if (onSuccess !== undefined) {
                onSuccess()
            }
            await new Promise((resolve) => {
                setTimeout(resolve, 500)
            })
            dispatch(incrementSelectedEntityIdx(contributionJustification))
        }
        return result
    }
    if (isLoading) {
        return <CosmaeLoading />
    }
    return (
        <>
            <Row className="h-100 overflow-hidden">
                <Col xs={3} className="h-100 overflow-hidden d-flex flex-column">
                    <Row className="h-100 overflow-y-scroll">
                        <EntityConflictList entityConflicts={entities.value} />
                    </Row>
                    <Row className="mt-2 justify-content-center">
                        <CompleteAssignmentButton
                            idContributionPersistent={idContributionPersistent}
                        />
                    </Row>
                </Col>
                <Col className="h-95 overflow-hidden d-flex flex-column">
                    <Row className="h-100 w-100 ms-2 mt-3">
                        <div id="portal">
                            <EntityConflictBody
                                putDuplicateCallback={putDuplicateCallback}
                                idContributionPersistent={idContributionPersistent}
                            />
                        </div>
                    </Row>
                </Col>
            </Row>
            <LastMatchModal idContributionPersistent={idContributionPersistent} />
        </>
    )
}

export function EntityConflictBody({
    idContributionPersistent,
    putDuplicateCallback
}: {
    idContributionPersistent: string
    putDuplicateCallback: PutDuplicateCallback
}) {
    const selectedEntity = useSelector(selectSelectedEntity)
    const [columnList, columnIndices] = useSelector(selectColumns)
    const matchColumns = useSelector(selectMatchColumnList)
    const dispatch: AppDispatch = useDispatch()
    useEffect(() => {
        if (selectedEntity === undefined) {
            return
        }
        const entityMap: { [key: string]: string[] } = {}
        entityMap[selectedEntity.idPersistent] = [
            selectedEntity.idPersistent,
            ...new Set(
                selectedEntity.similarEntities.value.map(
                    (entity) => entity.idPersistent
                )
            )
        ]
        dispatch(
            getContributionValues({
                idContributionPersistent: idContributionPersistent,
                entitiesGroupMap: entityMap,
                columnList: [...matchColumns, ...columnList]
            })
        )
    }, [idContributionPersistent, selectedEntity?.idPersistent, matchColumns])
    if (selectedEntity === undefined) {
        return <span>Please select an entity</span>
    }
    if (selectedEntity.similarEntities.isLoading) {
        return <CosmaeLoading />
    } else {
        return (
            <>
                <Col className="h-100 d-flex flex-column">
                    <Row className="ps-4 justify-content-between align-middle">
                        <Col>
                            <div className="w-400px">
                                <EntitySearch
                                    resultsClassName="vh-50 w-400px"
                                    onSearchResultClicked={(
                                        idSearchedEntityPersistent
                                    ) =>
                                        dispatch(
                                            getAdditionalEntityScoreThunk(
                                                idContributionPersistent,
                                                selectedEntity.idPersistent,
                                                idSearchedEntityPersistent
                                            )
                                        ).then((result) => {
                                            if (result) {
                                                dispatch(
                                                    getContributionValues({
                                                        idContributionPersistent:
                                                            idContributionPersistent,
                                                        entitiesGroupMap: {
                                                            [selectedEntity.idPersistent]:
                                                                [
                                                                    selectedEntity.idPersistent,
                                                                    idSearchedEntityPersistent
                                                                ]
                                                        },
                                                        columnList: [
                                                            ...matchColumns,
                                                            ...columnList
                                                        ]
                                                    })
                                                )
                                            }
                                        })
                                    }
                                />
                            </div>
                        </Col>
                        <Col xs="auto">
                            <Row>
                                <Col xs="auto" key="change-justification-button">
                                    <ChangeJustificationButton />
                                </Col>
                                <Col xs="auto" key="entities-step-add-column-button">
                                    <Button
                                        onClick={() => dispatch(toggleColumnMenu())}
                                    >
                                        Show Additional Columns
                                    </Button>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    <Row className="h-100">
                        <EntitySimilarityItem
                            entity={selectedEntity}
                            putDuplicateCallback={putDuplicateCallback}
                            numMatchColumns={matchColumns.length}
                            numColumns={columnList.length}
                        />
                    </Row>
                </Col>
                <AddColumnsModal
                    idContributionPersistent={idContributionPersistent}
                    columnIndices={columnIndices}
                />
            </>
        )
    }
}

function NoConflictBody({
    contributionJustification
}: {
    contributionJustification: string | undefined
}) {
    const dispatch = useDispatch()
    return (
        <Col className="h-100 w-100">
            <Row className="justify-content-center">This entity has no conflicts.</Row>
            <Row className="justify-content-center" xs="auto">
                <Button
                    onClick={() =>
                        dispatch(incrementSelectedEntityIdx(contributionJustification))
                    }
                >
                    Next with conflicts
                </Button>
            </Row>
        </Col>
    )
}

const zeroBounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0
}

export function EntitySimilarityItem({
    entity,
    putDuplicateCallback,
    numMatchColumns,
    numColumns
}: {
    entity: EntityWithDuplicates
    putDuplicateCallback: PutDuplicateCallback
    numMatchColumns: number
    numColumns: number
}) {
    const entityColumnDefs = useSelector(selectEntityColumnDefs)
    const columnRowDefs = useSelector(selectColumnRowDefs)
    const contributionJustification = useSelector(selectContributionJustification)
    const matchColumnList = useSelector(selectMatchColumnList)
    const { similarEntities, displayTxtDetails: entityDisplayTxtDetails } = entity
    const dispatch = useDispatch()
    const [tooltip, setTooltip] = useState<
        { val: string; bounds: IBounds } | undefined
    >()
    const { layerProps: tooltipLayerProps, renderLayer: tooltipRenderLayer } = useLayer(
        {
            isOpen: tooltip !== undefined,
            triggerOffset: 4,
            auto: true,
            container: 'portal',
            trigger: {
                getBounds: () => tooltip?.bounds ?? zeroBounds
            }
        }
    )

    const timeoutRef = useRef(0)

    const onItemHovered = useCallback(
        (args: GridMouseEventArgs) => {
            const colIdx = args.location[0]
            if (args.kind === 'cell' && colIdx > 0 && args.location[1] == 3) {
                let displayTxtDetails = entityDisplayTxtDetails
                if (colIdx > 1) {
                    displayTxtDetails =
                        similarEntities.value[colIdx - 2].displayTxtDetails
                }
                window.clearTimeout(timeoutRef.current)
                setTooltip(undefined)
                let tooltipValue = ''
                if (typeof entityDisplayTxtDetails == 'string') {
                    tooltipValue = displayTxtDetails as string
                } else {
                    tooltipValue = constructColumnTitle(
                        (displayTxtDetails as Column).namePath
                    )
                }
                timeoutRef.current = window.setTimeout(() => {
                    setTooltip({
                        val: `Display text source: ${tooltipValue}`,
                        bounds: {
                            // translate to react-laag types
                            left: args.bounds.x,
                            top: args.bounds.y,
                            width: args.bounds.width,
                            height: args.bounds.height,
                            right: args.bounds.x + args.bounds.width,
                            bottom: args.bounds.y + args.bounds.height
                        }
                    })
                }, 1000)
            } else {
                window.clearTimeout(timeoutRef.current)
                timeoutRef.current = 0
                setTooltip(undefined)
            }
        },
        [similarEntities.value, entityDisplayTxtDetails]
    )
    if (similarEntities.errorMsg !== undefined) {
        return <CosmaeLoading />
    }
    if (
        similarEntities.value.length == 0 &&
        (entity.justificationTxt !== undefined ||
            contributionJustification !== undefined)
    ) {
        return (
            <>
                <NoConflictBody contributionJustification={contributionJustification} />
                <JustificationModal putDuplicateCallback={putDuplicateCallback} />
            </>
        )
    }
    return (
        <>
            <Row
                className="h-100 w-100 mb-2 ms-3 me-3"
                data-testid="table-container-outer"
            >
                <div
                    className="br-12 ps-0 pe-0 h-100 w-100 overflow-hidden"
                    data-testid="table-container-inner"
                >
                    <DataEditor
                        customRenderers={[
                            loadingCellRenderer,
                            ReplaceButtonCellRenderer
                        ]}
                        rows={4 + numColumns}
                        getCellContent={mkCellContentCallback(
                            entity,
                            columnRowDefs,
                            numMatchColumns,
                            matchColumnList
                        )}
                        freezeColumns={2}
                        columns={entityColumnDefs}
                        rowSelect="none"
                        height="100%"
                        width="100%"
                        columnSelect="none"
                        rangeSelect="cell"
                        onColumnResize={(_col, size, idx) =>
                            dispatch(setColumnWidth({ idx, width: size }))
                        }
                        onGridSelectionChange={(selection: GridSelection) => {
                            const current = selection.current
                            if (current !== undefined) {
                                //Select range
                                const [colIdx, rowIdx] = current.cell
                                if (rowIdx != 0 || colIdx == 0) {
                                    return
                                }
                                if (colIdx === undefined || colIdx < 2) {
                                    if (
                                        entity.justificationTxt === undefined &&
                                        contributionJustification === undefined
                                    ) {
                                        dispatch(openJustificationInput())
                                    } else {
                                        putDuplicateCallback({
                                            idEntityOriginPersistent:
                                                entity.idPersistent,
                                            idEntityDestinationPersistent: undefined
                                        })
                                    }
                                } else {
                                    putDuplicateCallback({
                                        idEntityOriginPersistent: entity.idPersistent,
                                        idEntityDestinationPersistent:
                                            entity.similarEntities.value[colIdx - 2]
                                                .idPersistent
                                    })
                                }
                            }
                        }}
                        onItemHovered={onItemHovered}
                    />
                    {tooltip != undefined &&
                        tooltipRenderLayer(
                            <div
                                {...tooltipLayerProps}
                                style={{
                                    ...tooltipLayerProps.style,
                                    padding: '8px 12px',
                                    color: 'white',
                                    font: '500 13px Inter',
                                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                    borderRadius: 9
                                }}
                            >
                                {tooltip.val}
                            </div>
                        )}
                </div>
            </Row>
            <JustificationModal putDuplicateCallback={putDuplicateCallback} />
        </>
    )
}

export function EntityConflictList({
    entityConflicts
}: {
    entityConflicts: EntityWithDuplicates[] | undefined
}) {
    const dispatch = useDispatch()
    const selectEntityCallback = (idx: number) => dispatch(setSelectedEntityIdx(idx))
    const selectedEntity = useSelector(selectSelectedEntity)
    if (entityConflicts?.length == 0) {
        return <div>No entities require matching.</div>
    }
    if (entityConflicts === undefined || entityConflicts[0].similarEntities.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {entityConflicts.map((entity, idx) => (
                <EntityConflictListItem
                    entity={entity}
                    active={entity == selectedEntity}
                    key={entity.idPersistent}
                    onClick={() => {
                        selectEntityCallback(idx)
                    }}
                />
            ))}
        </ListGroup>
    )
}

export function EntityConflictListItem({
    entity,
    active,
    onClick
}: {
    entity: EntityWithDuplicates
    active: boolean
    onClick: VoidFunction
}) {
    return (
        <ListGroup.Item active={active} onClick={onClick} role="button">
            {entity.displayTxt}
        </ListGroup.Item>
    )
}
