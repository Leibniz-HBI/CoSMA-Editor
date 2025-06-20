import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    ContributionEntityState,
    EntityWithDuplicates,
    newContributionEntityState,
    ScoredEntity
} from './state'
import { Value } from './state'
import { newRemote, RemoteInterface } from '../../util/state'
import { CellValue } from '../../table/state'
import { Column } from '../../column_menu/state'

const initialState: ContributionEntityState = newContributionEntityState({})

export interface ContributionEntityDuplicatesPayload<T> {
    idPersistent: string
    details: T
}
export interface ContributionValuesPayload<T> {
    /**
     * Groups entities according to their similarity group.
     * Each group should also contain the entity itself.
     */
    idEntityPersistentGroupMap: { [key: string]: string[] }
    /**
     * Contains ids of columnIds relevant for this action
     */
    columnList: Column[]
    details: T
}

function getEntity(
    state: ContributionEntityState,
    idPersistent: string
): EntityWithDuplicates | undefined {
    const idx = state.entityMap[idPersistent]
    if (idx === undefined) {
        return undefined
    }
    return state.entities.value?.at(idx)
}

export const contributionEntitySlice = createSlice({
    name: 'contributionEntity',
    initialState,
    reducers: {
        putDuplicateStart(
            state: ContributionEntityState,
            action: PayloadAction<string>
        ) {
            const entity = getEntity(state, action.payload)
            if (entity !== undefined) {
                entity.assignedDuplicate.isLoading = true
            }
        },
        putDuplicateSuccess(
            state: ContributionEntityState,
            action: PayloadAction<
                ContributionEntityDuplicatesPayload<ScoredEntity | undefined>
            >
        ) {
            const entity = getEntity(state, action.payload.idPersistent)
            if (entity !== undefined) {
                entity.assignedDuplicate = newRemote(action.payload.details)
            }
        },
        putDuplicateError(
            state: ContributionEntityState,
            action: PayloadAction<ContributionEntityDuplicatesPayload<void>>
        ) {
            const entity = getEntity(state, action.payload.idPersistent)
            if (entity !== undefined) {
                entity.assignedDuplicate.isLoading = false
            }
        },
        getDuplicatesStart(
            state: ContributionEntityState,
            action: PayloadAction<string>
        ) {
            const entity = getEntity(state, action.payload)
            if (entity !== undefined) {
                entity.similarEntities.isLoading = true
            }
        },
        getDuplicatesSuccess(
            state: ContributionEntityState,
            action: PayloadAction<
                ContributionEntityDuplicatesPayload<{
                    scoredEntities: ScoredEntity[]
                    assignedEntity?: ScoredEntity
                }>
            >
        ) {
            const entity = getEntity(state, action.payload.idPersistent)
            if (entity !== undefined) {
                entity.assignedDuplicate = newRemote(
                    action.payload.details.assignedEntity
                )
                entity.similarEntities = newRemote(
                    action.payload.details.scoredEntities
                )
                const newEntityMap: { [key: string]: number } = {}
                for (let idx = 0; idx < entity.similarEntities.value.length; ++idx) {
                    newEntityMap[entity.similarEntities.value[idx].idPersistent] = idx
                }
                entity.entityMap = newEntityMap
            }
        },
        getDuplicatesError(
            state: ContributionEntityState,
            action: PayloadAction<ContributionEntityDuplicatesPayload<void>>
        ) {
            const entity = getEntity(state, action.payload.idPersistent)
            if (entity !== undefined) {
                entity.similarEntities.isLoading = false
            }
        },

        getContributionValuesStart(
            state: ContributionEntityState,
            action: PayloadAction<ContributionValuesPayload<void>>
        ) {
            if (state.entities.value === undefined) {
                return
            }
            for (const column of action.payload.columnList) {
                if (state.columnMap[column.idPersistent] === undefined) {
                    state.columnList.push(column)
                    state.columnMap[column.idPersistent] = state.columnList.length - 1
                    for (const entity of state.entities.value) {
                        entity.cellContents.push(newRemote([]))
                        for (const candidate of entity.similarEntities.value) {
                            candidate.cellContents.push(newRemote([]))
                        }
                    }
                }
            }
            const strategy = ({
                cellContents
            }: {
                cellContents: RemoteInterface<CellValue[]>
            }) => {
                cellContents.isLoading = true
            }
            contributionValueReducer({
                entities: state.entities.value,
                entitiesMap: state.entityMap,
                columnMap: state.columnMap,
                action: action.payload,
                strategy
            })
        },
        getContributionValuesSuccess(
            state: ContributionEntityState,
            action: PayloadAction<ContributionValuesPayload<Value[]>>
        ) {
            // Need to invert the grouping of the action to correctly assign instances.
            if (state.entities.value === undefined) {
                return
            }
            const reverseEntityGroupMap = mkReverseEntityGroupMap(
                action.payload.idEntityPersistentGroupMap
            )

            const entityGroupMap = mkEntityGroupMap(
                action.payload.details,
                reverseEntityGroupMap
            )
            const strategy = ({
                cellContents,
                idEntityGroupPersistent,
                idEntityMatchPersistent,
                idColumnPersistent
            }: {
                cellContents: RemoteInterface<CellValue[]>
                idEntityGroupPersistent: string
                idEntityMatchPersistent: string
                idColumnPersistent: string
            }) => {
                cellContents.isLoading = false
                const instances = entityGroupMap
                    .get(idEntityGroupPersistent)
                    ?.get(idEntityMatchPersistent)
                    ?.get(idColumnPersistent)
                if (instances !== undefined) {
                    cellContents.value = instances?.map(
                        (instance) => instance.cellValue
                    )
                }
            }
            contributionValueReducer({
                entities: state.entities.value,
                entitiesMap: state.entityMap,
                columnMap: state.columnMap,
                action: action.payload,
                strategy
            })
        },
        getContributionValuesError(
            state: ContributionEntityState,
            action: PayloadAction<ContributionValuesPayload<void>>
        ) {
            if (state.entities.value === undefined) {
                return
            }
            const strategy = ({
                cellContents
            }: {
                cellContents: RemoteInterface<CellValue[]>
            }) => {
                cellContents.isLoading = false
            }
            contributionValueReducer({
                entities: state.entities.value,
                entitiesMap: state.entityMap,
                columnMap: state.columnMap,
                action: action.payload,
                strategy
            })
        },
        removeAdditionalColumnByIdPersistent(
            state: ContributionEntityState,
            action: PayloadAction<string>
        ) {
            if (state.entities.value === undefined) {
                return
            }
            const columnId = state.columnMap[action.payload]
            if (columnId === undefined) {
                return
            }
            state.columnList.splice(columnId, 1)
            state.columnMap = Object.fromEntries(
                state.columnList.map((column, idx) => [column.idPersistent, idx])
            )
            for (const entity of state.entities.value) {
                entity.cellContents.splice(columnId, 1)
                for (const match of entity.similarEntities.value) {
                    match.cellContents.splice(columnId, 1)
                }
            }
        },
        toggleColumnMenu(state: ContributionEntityState) {
            state.showColumnMenu = !state.showColumnMenu
        },
        getContributionEntitiesStart(state: ContributionEntityState) {
            state.entities.isLoading = true
            // still need to set error message here, to not show no conflicts in UI.
            state.entities.errorMsg = undefined
        },
        getContributionEntitiesSuccess(
            state: ContributionEntityState,
            action: PayloadAction<EntityWithDuplicates[]>
        ) {
            state.entities = newRemote(action.payload)
            const newMap: { [key: string]: number } = {}

            for (let idx = 0; idx < action.payload.length; ++idx) {
                newMap[action.payload[idx].idPersistent] = idx
            }
            state.entityMap = newMap
        },
        getContributionEntitiesError(state: ContributionEntityState) {
            state.entities.isLoading = false
            // still need to set error message here, to not show no conflicts in UI.
            state.entities.errorMsg = 'Could not get contribution entities'
        },
        getAdditionalEntityScoreError(_state: ContributionEntityState) {
            // possibly use in the future for indicator
        },
        getAdditionalEntityScoreStart(_state: ContributionEntityState) {
            // possibly use in the future for indicator
        },
        getAdditionalEntityScoreSuccess(
            state: ContributionEntityState,
            action: PayloadAction<{ idEntityContribution: string; match: ScoredEntity }>
        ) {
            const idx = state.entityMap[action.payload.idEntityContribution]
            if (idx === undefined || state.entities.value === undefined) {
                return
            }
            const contributedEntity = state.entities.value[idx]
            if (contributedEntity === undefined) {
                return
            }
            // set cell contents for additional entity
            action.payload.match.cellContents = state.columnList.map((_col) =>
                newRemote([])
            )
            // insert entity into matches
            contributedEntity.similarEntities.value.splice(0, 0, action.payload.match)
            contributedEntity.entityMap = Object.fromEntries(
                contributedEntity.similarEntities.value.map((entity, idx) => [
                    entity.idPersistent,
                    idx
                ])
            )
            state.matchWidths.push(200)
        },
        completeEntityAssignmentStart(state: ContributionEntityState) {
            state.completeEntityAssignment.isLoading = true
        },
        completeEntityAssignmentSuccess(state: ContributionEntityState) {
            state.completeEntityAssignment = newRemote(true, false)
        },
        completeEntityAssignmentError(state: ContributionEntityState) {
            state.completeEntityAssignment = newRemote(false, false)
        },
        setSelectedEntityIdx(
            state: ContributionEntityState,
            action: PayloadAction<number>
        ) {
            const selectedIdx = action.payload
            state.selectedEntityIdx = selectedIdx
            pushMatchWidth(state, selectedIdx)
            state.hitLastMatch = false
        },
        incrementSelectedEntityIdx(
            state: ContributionEntityState,
            action: PayloadAction<string | undefined>
        ) {
            if (state.entities.value === undefined) {
                return
            }
            for (
                let idx = (state.selectedEntityIdx ?? -1) + 1;
                idx < state.entities.value.length;
                ++idx
            ) {
                if (
                    state.entities.value[idx].similarEntities.value.length > 0 ||
                    (action.payload === undefined &&
                        state.entities.value[idx].justificationTxt === undefined)
                ) {
                    state.selectedEntityIdx = idx
                    pushMatchWidth(state, idx)
                    state.hitLastMatch = false
                    return
                }
            }
            state.hitLastMatch = true
        },
        openJustificationInput(state: ContributionEntityState) {
            state.showJustificationDialog = true
        },
        closeJustificationInput(state: ContributionEntityState) {
            state.showJustificationDialog = false
        },
        clearHitLastMatch(state: ContributionEntityState) {
            state.hitLastMatch = false
        },
        setColumnWidth(
            state: ContributionEntityState,
            action: PayloadAction<{ idx: number; width: number }>
        ) {
            state.matchWidths[action.payload.idx] = action.payload.width
        },
        clearContributionEntityState(state: ContributionEntityState) {
            state.selectedEntityIdx = undefined
            state.hitLastMatch = false
        }
    }
})
function pushMatchWidth(state: ContributionEntityState, selectedIdx: number) {
    if (state.entities.value === undefined) {
        return
    }
    for (
        let idx =
            state.entities.value[selectedIdx].similarEntities.value.length +
            2 -
            state.matchWidths.length;
        idx > 0;
        idx--
    ) {
        state.matchWidths.push(200)
    }
}

function mkEntityGroupMap(
    instances: Value[],
    reverseEntityGroupMap: Map<string, string[]>
) {
    // Three layer hierarchy. First is for entity group.
    // Second for actual entity and third for column.
    const entityGroupMap = new Map<string, Map<string, Map<string, Value[]>>>()
    for (const instance of instances) {
        const relevantEntityIdList =
            reverseEntityGroupMap.get(instance.idEntityPersistent) ?? []
        for (const idEntity of relevantEntityIdList) {
            const columnMap = entityGroupMap.get(idEntity)
            if (columnMap === undefined) {
                entityGroupMap.set(
                    idEntity,
                    new Map([
                        [
                            instance.idEntityPersistent,
                            new Map([[instance.idColumnPersistent, [instance]]])
                        ]
                    ])
                )
            } else {
                const entityInstanceMap = columnMap.get(instance.idEntityPersistent)
                if (entityInstanceMap === undefined) {
                    columnMap.set(
                        instance.idEntityPersistent,
                        new Map([[instance.idColumnPersistent, [instance]]])
                    )
                } else {
                    const instanceList = entityInstanceMap.get(
                        instance.idColumnPersistent
                    )
                    if (instanceList === undefined) {
                        entityInstanceMap.set(instance.idColumnPersistent, [instance])
                    } else {
                        instanceList.push(instance)
                    }
                }
            }
        }
    }
    return entityGroupMap
}

function mkReverseEntityGroupMap(idEntityPersistentGroupMap: {
    [key: string]: string[]
}) {
    const reverseEntityGroupMap = new Map<string, string[]>()
    for (const [idEntityGroup, idEntityList] of Object.entries(
        idEntityPersistentGroupMap
    )) {
        for (const idEntity of idEntityList) {
            const reverseGroupList = reverseEntityGroupMap.get(idEntity)
            if (reverseGroupList === undefined) {
                reverseEntityGroupMap.set(idEntity, [idEntityGroup])
            } else {
                reverseGroupList.push(idEntityGroup)
            }
        }
    }
    return reverseEntityGroupMap
}

export function contributionValueReducer({
    entities,
    entitiesMap,
    columnMap,
    action,
    strategy
}: {
    entities: EntityWithDuplicates[]
    entitiesMap: { [key: string]: number }
    columnMap: { [key: string]: number }
    action: ContributionValuesPayload<unknown>
    strategy: (props: {
        cellContents: RemoteInterface<CellValue[]>
        idEntityGroupPersistent: string
        idEntityMatchPersistent: string
        idColumnPersistent: string
    }) => void
}) {
    // use keys of action to get all groups even if there is no data
    for (const idEntityGroupPersistent of Object.keys(
        action.idEntityPersistentGroupMap
    )) {
        // but get values from grouped data
        const idx = entitiesMap[idEntityGroupPersistent]
        if (idx !== undefined) {
            contributionValueEntityReducer({
                entity: entities[idx],
                columnMap,
                action,
                idEntityGroupPersistent,
                strategy
            })
        }
    }
}
export function contributionValueEntityReducer({
    entity,
    columnMap,
    action,
    idEntityGroupPersistent,
    strategy
}: {
    entity: EntityWithDuplicates
    columnMap: { [key: string]: number }
    action: ContributionValuesPayload<unknown>
    idEntityGroupPersistent: string
    strategy: (props: {
        cellContents: RemoteInterface<CellValue[]>
        idEntityGroupPersistent: string
        idEntityMatchPersistent: string
        idColumnPersistent: string
    }) => void
}) {
    // get all relevant idEntityPersistent for this entity.
    const idEntityGroup = action.idEntityPersistentGroupMap[entity.idPersistent] ?? []
    for (const idEntityMatchPersistent of idEntityGroup) {
        if (idEntityMatchPersistent == entity.idPersistent) {
            //alter the entity itself
            contributionValueCellContentReducer({
                cellContents: entity.cellContents,
                columnMap,
                columnList: action.columnList,
                idEntityGroupPersistent,
                idEntityMatchPersistent,
                strategy
            })
        } else {
            // alter the similar entities
            const idx = entity.entityMap[idEntityMatchPersistent]
            if (
                idx === undefined ||
                idEntityMatchPersistent !=
                    entity.similarEntities.value[idx].idPersistent
            ) {
                continue
            }
            contributionValueCellContentReducer({
                cellContents: entity.similarEntities.value[idx].cellContents,
                columnMap,
                columnList: action.columnList,
                idEntityGroupPersistent,
                idEntityMatchPersistent,
                strategy
            })
        }
    }
}
export function contributionValueCellContentReducer({
    cellContents,
    columnMap,
    columnList,
    idEntityGroupPersistent,
    idEntityMatchPersistent,
    strategy
}: {
    cellContents: RemoteInterface<CellValue[]>[]
    columnMap: { [key: string]: number }
    columnList: Column[]
    idEntityGroupPersistent: string
    idEntityMatchPersistent: string
    strategy: (props: {
        cellContents: RemoteInterface<CellValue[]>
        idEntityGroupPersistent: string
        idEntityMatchPersistent: string
        idColumnPersistent: string
    }) => void
}) {
    for (const column of columnList) {
        const idx = columnMap[column.idPersistent]
        if (idx !== undefined) {
            strategy({
                cellContents: cellContents[idx],
                idEntityGroupPersistent,
                idEntityMatchPersistent,
                idColumnPersistent: column.idPersistent
            })
        }
    }
}

export const {
    completeEntityAssignmentError,
    completeEntityAssignmentStart,
    completeEntityAssignmentSuccess,
    getContributionEntitiesError,
    getContributionEntitiesStart,
    getContributionEntitiesSuccess,
    getContributionValuesError,
    getContributionValuesStart,
    getContributionValuesSuccess,
    removeAdditionalColumnByIdPersistent,
    getDuplicatesError,
    getDuplicatesStart,
    getDuplicatesSuccess,
    putDuplicateError,
    putDuplicateStart,
    putDuplicateSuccess,
    getAdditionalEntityScoreError,
    getAdditionalEntityScoreStart,
    getAdditionalEntityScoreSuccess,
    toggleColumnMenu,
    setSelectedEntityIdx,
    incrementSelectedEntityIdx,
    clearHitLastMatch,
    setColumnWidth,
    openJustificationInput,
    closeJustificationInput,
    clearContributionEntityState
} = contributionEntitySlice.actions
