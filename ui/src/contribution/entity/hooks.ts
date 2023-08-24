import {
    CustomCell,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    LoadingCell,
    Theme
} from '@glideapps/glide-data-grid'
import { ColumnDefinition, ColumnType } from '../../column_menu/state'
import { Remote, useThunkReducer } from '../../util/state'
import { LoadContributionDetailsAsyncAction } from '../details/async_action'
import {
    CompleteEntityAssignmentClearErrorAction,
    ToggleTagDefinitionMenuAction
} from './action'
import {
    CompleteEntityAssignmentAction,
    GetContributionEntitiesAction,
    GetContributionEntityDuplicateCandidatesAction,
    GetContributionTagInstancesAsyncAction,
    PutDuplicateAction
} from './async_actions'
import { contributionEntityReducer } from './reducer'
import { ContributionEntityState, EntityWithDuplicates } from './state'
import { CellValue } from '../../table/state'
import { AssignType } from '../../table/draw'

export type GridColumWithType = GridColumn & { columnType: ColumnType }

export function constructColumnTitle(namePath: string[]): string {
    if (namePath === undefined || namePath.length == 0) {
        return 'UNKNOWN'
    }
    if (namePath.length > 3) {
        namePath[0] +
            ' -> ... -> ' +
            namePath[namePath.length - 2] +
            ' -> ' +
            namePath[namePath.length - 1]
    }
    return namePath[0] + ' ' + namePath.slice(1).join(' -> ')
}

export type PutDuplicateCallback = (
    idEntityOriginPersistent: string,
    idEntityDestinationPersistent?: string
) => void
const emptyCell = {
    kind: 'text' as GridCellKind,
    allowOverlay: false,
    displayData: '',
    data: ''
} as GridCell
const loadingCell = {
    kind: 'loading' as GridCellKind,
    allowOverlay: true,
    style: 'faded'
} as LoadingCell

export function mkComparisonCell(
    columnType: ColumnType,
    cellValues: CellValue[],
    themeOverride?: Partial<Theme>
): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    let cellContent
    let displayData: string | undefined = undefined
    if (columnType == ColumnType.Inner) {
        // workaround for typescript jest compatibility
        cellKind = 'boolean' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
        } else {
            cellContent = cellValues[0].value
        }
    } else if (columnType == ColumnType.Float) {
        // workaround for typescript jest compatibility
        cellKind = 'number' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
            displayData = ''
        } else {
            cellContent = cellValues[0].value
            displayData = cellContent?.toString()
        }
    } else if (columnType == ColumnType.String) {
        if (cellValues.length == 0) {
            cellContent = ''
            displayData = ''
        } else {
            if (cellValues.length < 2) {
                cellContent = cellValues[0].value
                displayData = cellContent?.toString() ?? ''
                if (cellContent === undefined || cellContent === null) {
                    cellContent = ''
                }
            } else {
                // workaround for typescript jest compatibility
                cellKind = 'bubble' as GridCellKind
                cellContent = cellValues.map((value) => value.value)
                displayData = ''
            }
        }
    }
    return {
        kind: cellKind as GridCellKind,
        allowOverlay: false,
        displayData: displayData,
        data: cellContent,
        contentAlign: 'right',
        themeOverride
    } as GridCell
}
export function mkCellContentCallback(
    entityGroup: EntityWithDuplicates,
    columnTypes: GridColumWithType[]
): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        let themeOverride = undefined
        let contentAlign = 'right'
        if (row_idx == 0) {
            themeOverride = { baseFontStyle: 'bold 13px' }
        }
        if (col_idx < 3) {
            if (col_idx == 0) {
                let replaceInfo = undefined
                if (row_idx == 0) {
                    replaceInfo = new AssignType(
                        false,
                        entityGroup.assignedDuplicate.value?.idPersistent == undefined
                    )
                } else {
                    replaceInfo = new AssignType(
                        true,
                        entityGroup.similarEntities.value[row_idx - 1].idPersistent ==
                            entityGroup.assignedDuplicate.value?.idPersistent
                    )
                }
                return {
                    kind: 'custom' as GridCellKind,
                    data: replaceInfo
                } as CustomCell<AssignType>
            }
            let displayTxt = entityGroup.displayTxt
            if (col_idx == 2) {
                if (row_idx == 0) {
                    displayTxt = ''
                } else {
                    displayTxt =
                        Math.round(
                            entityGroup.similarEntities.value[row_idx - 1].similarity *
                                100
                        ) + ' %'
                }
            } else {
                contentAlign = 'left'
                if (row_idx != 0) {
                    displayTxt =
                        entityGroup.similarEntities.value[row_idx - 1].displayTxt
                }
            }

            return {
                kind: 'text' as GridCellKind,
                allowOverlay: false,
                displayData: displayTxt,
                data: displayTxt,
                themeOverride,
                contentAlign
            } as GridCell
        }
        let cellContents
        if (row_idx == 0) {
            cellContents = entityGroup.cellContents[col_idx - 3]
        } else {
            if (entityGroup.similarEntities.isLoading) {
                return loadingCell
            }
            cellContents =
                entityGroup.similarEntities.value[row_idx - 1].cellContents[col_idx - 3]
        }
        if (cellContents === undefined) {
            return emptyCell
        }
        if (cellContents.isLoading) {
            return loadingCell
        }
        return mkComparisonCell(
            columnTypes[col_idx].columnType,
            cellContents.value,
            themeOverride
        )
    }
}

export function useContributionEntities(idContributionPersistent: string) {
    const [state, dispatch] = useThunkReducer(
        contributionEntityReducer,
        new ContributionEntityState({
            entities: new Remote([]),
            contributionCandidate: new Remote(undefined)
        })
    )
    const isLoading = state.contributionCandidate.isLoading || state.entities.isLoading
    return {
        getEntityDuplicatesCallback: () => {
            if (isLoading) {
                return
            }
            dispatch(new LoadContributionDetailsAsyncAction(idContributionPersistent))
            dispatch(new GetContributionEntitiesAction(idContributionPersistent)).then(
                async (entities) => {
                    if (entities === undefined) {
                        return undefined
                    }
                    const chunkSize = 80
                    for (
                        let chunkStartIdx = 0;
                        chunkStartIdx < entities?.length;
                        chunkStartIdx += chunkSize
                    ) {
                        const chunkEndIdx = Math.min(
                            entities?.length,
                            chunkStartIdx + chunkSize
                        )
                        const entityGroupMap = await dispatch(
                            new GetContributionEntityDuplicateCandidatesAction({
                                idContributionPersistent,
                                entityIdPersistentList: entities
                                    ?.slice(chunkStartIdx, chunkEndIdx)
                                    .map((entity) => entity.idPersistent)
                            })
                        )
                        if (
                            entityGroupMap !== undefined &&
                            state.tagDefinitions.length > 0
                        ) {
                            dispatch(
                                new GetContributionTagInstancesAsyncAction({
                                    entitiesGroupMap: entityGroupMap,
                                    tagDefinitionList: state.tagDefinitions,
                                    idContributionPersistent: idContributionPersistent
                                })
                            )
                        }
                    }
                }
            )
        },
        isLoading: isLoading,
        columnDefs: [
            {
                id: 'Assignment',
                title: 'Assignment',
                width: 200,
                columnType: ColumnType.Inner
            } as GridColumWithType,
            {
                id: 'display_txt',
                title: 'Display Text',
                width: 200,
                columnType: ColumnType.String
            } as GridColumWithType,
            {
                id: 'similarity',
                title: 'Similarity',
                width: 100,
                columnType: ColumnType.String
            } as GridColumWithType,
            ...state.tagDefinitions.map((colDef) => {
                return {
                    id: colDef.idPersistent,
                    title: constructColumnTitle(colDef.namePath),
                    width: 200,
                    columnType: colDef.columnType
                } as GridColumWithType
            })
        ],
        showTagDefinitionsMenu: state.showTagDefinitionMenu,
        tagDefinitionMap: state.tagDefinitionMap,
        contributionCandidate: state.contributionCandidate,
        entities: state.entities,
        minLoadingIdx: state.minEntityLoadingIndex(),
        completeEntityAssignment: state.completeEntityAssignment,
        completeEntityAssignmentCallback: () => {
            if (state.completeEntityAssignment.isLoading) {
                return
            }
            dispatch(new CompleteEntityAssignmentAction(idContributionPersistent))
        },
        clearEntityAssignmentErrorCallback: () =>
            dispatch(new CompleteEntityAssignmentClearErrorAction()),
        isDuplicates: state.isDuplicates(),
        putDuplicateCallback: (
            idEntityOriginPersistent: string,
            idEntityDestinationPersistent?: string
        ) =>
            dispatch(
                new PutDuplicateAction({
                    idContributionPersistent,
                    idEntityOriginPersistent,
                    idEntityDestinationPersistent
                })
            ),
        toggleTagDefinitionsMenuCallback: () =>
            dispatch(new ToggleTagDefinitionMenuAction()),
        addTagDefinitionCallback: (columnDefinition: ColumnDefinition) => {
            const chunkSize = 80
            for (
                let startIdx = 0;
                startIdx < state.entities.value.length;
                startIdx += chunkSize
            ) {
                if (state.entities.isLoading) {
                    return
                }
                const endIdx = Math.min(
                    state.entities.value.length,
                    startIdx + chunkSize
                )
                const entitiesSlice = state.entities.value.slice(startIdx, endIdx)
                const entitiesMap = new Map<string, string[]>()
                for (const entity of entitiesSlice) {
                    if (entity.similarEntities.isLoading) {
                        return
                    }
                    entitiesMap.set(entity.idPersistent, [
                        entity.idPersistent,
                        ...new Set(
                            entity.similarEntities.value.map(
                                (entity) => entity.idPersistent
                            )
                        )
                    ])
                }
                dispatch(
                    new GetContributionTagInstancesAsyncAction({
                        entitiesGroupMap: entitiesMap,
                        tagDefinitionList: [columnDefinition],
                        idContributionPersistent: idContributionPersistent
                    })
                )
            }
        }
    }
}
