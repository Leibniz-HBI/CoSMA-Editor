import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    ContributionEntityState,
    EntityWithDuplicates,
    newContributionEntityState,
    ScoredEntity
} from './state'
import { TagInstance } from './state'
import { newRemote, RemoteInterface } from '../../util/state'
import { CellValue, Entity } from '../../table/state'
import { TagDefinition } from '../../column_menu/state'

const initialState: ContributionEntityState = newContributionEntityState({})

export interface ContributionEntityDuplicatesPayload<T> {
    idPersistent: string
    details: T
}
export interface ContributionTagInstancesPayload<T> {
    /**
     * Groups entities according to their similarity group.
     * Each group should also contain the entity itself.
     */
    idEntityPersistentGroupMap: { [key: string]: string[] }
    /**
     * Contains ids of tagDefinitionIds relevant for this action
     */
    tagDefinitionList: TagDefinition[]
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
    return state.entities.value[idx]
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
                ContributionEntityDuplicatesPayload<Entity | undefined>
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
                    assignedEntity?: Entity
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

        getContributionTagInstancesStart(
            state: ContributionEntityState,
            action: PayloadAction<ContributionTagInstancesPayload<void>>
        ) {
            for (const tagDef of action.payload.tagDefinitionList) {
                if (state.tagDefinitionMap[tagDef.idPersistent] === undefined) {
                    state.tagDefinitions.push(tagDef)
                    state.tagDefinitionMap[tagDef.idPersistent] =
                        state.tagDefinitions.length - 1
                }
            }
            for (const idx in state.tagDefinitions) {
                for (const entity of state.entities.value) {
                    entity.cellContents[idx] = newRemote([])
                    for (const candidate of entity.similarEntities.value) {
                        candidate.cellContents[idx] = newRemote([])
                    }
                }
            }
            const strategy = (
                cellContents: RemoteInterface<CellValue[]>,
                _idEntityGroup: string,
                _idEntity: string,
                _idTagDef: string
            ) => {
                cellContents.value = []
                cellContents.isLoading = true
            }
            contributionTagInstanceReducer(
                state.entities.value,
                state.entityMap,
                state.tagDefinitionMap,
                action.payload,
                strategy
            )
        },
        getContributionTagInstancesSuccess(
            state: ContributionEntityState,
            action: PayloadAction<ContributionTagInstancesPayload<TagInstance[]>>
        ) {
            // Need to invert the grouping of the action to correctly assign instances.
            const reverseEntityGroupMap = mkReverseEntityGroupMap(
                action.payload.idEntityPersistentGroupMap
            )

            const entityGroupMap = mkEntityGroupMap(
                action.payload.details,
                reverseEntityGroupMap
            )
            const strategy = (
                cellContents: RemoteInterface<CellValue[]>,
                idEntityGroup: string,
                idEntity: string,
                idTagDef: string
            ) => {
                cellContents.isLoading = false
                const instances = entityGroupMap
                    .get(idEntityGroup)
                    ?.get(idEntity)
                    ?.get(idTagDef)
                if (instances !== undefined) {
                    cellContents.value = instances?.map(
                        (instance) => instance.cellValue
                    )
                }
            }
            contributionTagInstanceReducer(
                state.entities.value,
                state.entityMap,
                state.tagDefinitionMap,
                action.payload,
                strategy
            )
        },
        getContributionTagInstancesError(
            state: ContributionEntityState,
            action: PayloadAction<ContributionTagInstancesPayload<void>>
        ) {
            const strategy = (
                cellContents: RemoteInterface<CellValue[]>,
                _idEntityGroup: string,
                _idEntity: string,
                _idTagDef: string
            ) => {
                cellContents.isLoading = false
            }
            contributionTagInstanceReducer(
                state.entities.value,
                state.entityMap,
                state.tagDefinitionMap,
                action.payload,
                strategy
            )
        },
        toggleTagDefinitionMenu(state: ContributionEntityState) {
            state.showTagDefinitionMenu = !state.showTagDefinitionMenu
        },
        getContributionEntitiesStart(state: ContributionEntityState) {
            state.entities.isLoading = true
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
        },
        completeEntityAssignmentStart(state: ContributionEntityState) {
            state.completeEntityAssignment.isLoading = true
        },
        completeEntityAssignmentSuccess(state: ContributionEntityState) {
            state.completeEntityAssignment = newRemote(true, false)
        },
        completeEntityAssignmentError(
            state: ContributionEntityState,
            action: PayloadAction<string>
        ) {
            state.completeEntityAssignment = newRemote(false, false, action.payload)
        },
        completeEntityAssignmentClearError(state: ContributionEntityState) {
            state.completeEntityAssignment.errorMsg = undefined
        },
        setSelectedEntityIdx(
            state: ContributionEntityState,
            action: PayloadAction<number>
        ) {
            state.selectedEntityIdx = action.payload
        },
        incrementSelectedEntityIdx(state: ContributionEntityState) {
            state.selectedEntityIdx = Math.min(
                state.entities.value.length,
                (state.selectedEntityIdx ?? -1) + 1
            )
        }
    }
})
function mkEntityGroupMap(
    instances: TagInstance[],
    reverseEntityGroupMap: Map<string, string[]>
) {
    // Three layer hierarchy. First is for entity group.
    // Second for actual entity and third for tag definition
    const entityGroupMap = new Map<string, Map<string, Map<string, TagInstance[]>>>()
    for (const instance of instances) {
        const relevantEntityIdList =
            reverseEntityGroupMap.get(instance.idEntityPersistent) ?? []
        for (const idEntity of relevantEntityIdList) {
            const tagDefinitionMap = entityGroupMap.get(idEntity)
            if (tagDefinitionMap === undefined) {
                entityGroupMap.set(
                    idEntity,
                    new Map([
                        [
                            instance.idEntityPersistent,
                            new Map([[instance.idTagDefinitionPersistent, [instance]]])
                        ]
                    ])
                )
            } else {
                const entityInstanceMap = tagDefinitionMap.get(
                    instance.idEntityPersistent
                )
                if (entityInstanceMap === undefined) {
                    tagDefinitionMap.set(
                        instance.idEntityPersistent,
                        new Map([[instance.idTagDefinitionPersistent, [instance]]])
                    )
                } else {
                    const instanceList = entityInstanceMap.get(
                        instance.idTagDefinitionPersistent
                    )
                    if (instanceList === undefined) {
                        entityInstanceMap.set(instance.idTagDefinitionPersistent, [
                            instance
                        ])
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

export function contributionTagInstanceReducer(
    entities: EntityWithDuplicates[],
    entitiesMap: { [key: string]: number },
    tagDefinitionMap: { [key: string]: number },
    action: ContributionTagInstancesPayload<unknown>,
    strategy: (
        cellContents: RemoteInterface<CellValue[]>,
        idEntityGroupPersistent: string,
        idEntityPersistent: string,
        idTagDefinitionPersistent: string
    ) => void
) {
    // use keys of action to get all groups even if there is no data
    for (const idEntityGroup of Object.keys(action.idEntityPersistentGroupMap)) {
        // but get values from grouped data
        const idx = entitiesMap[idEntityGroup]
        if (idx !== undefined) {
            contributionTagInstanceEntityReducer(
                entities[idx],
                tagDefinitionMap,
                action,
                (cellContent, idEntity, idTagDefinitionPersistent) =>
                    strategy(
                        cellContent,
                        idEntityGroup,
                        idEntity,
                        idTagDefinitionPersistent
                    )
            )
        }
    }
}
export function contributionTagInstanceEntityReducer(
    entity: EntityWithDuplicates,
    tagDefinitionMap: { [key: string]: number },
    action: ContributionTagInstancesPayload<unknown>,
    strategy: (
        cellContents: RemoteInterface<CellValue[]>,
        idEntityPersistent: string,
        idTagDefinitionPersistent: string
    ) => void
) {
    // get all relevant idEntityPersistent for this entity.
    const idEntityGroup = action.idEntityPersistentGroupMap[entity.idPersistent] ?? []
    for (const idEntity of idEntityGroup) {
        if (idEntity == entity.idPersistent) {
            //alter the entity itself
            contributionTagInstanceCellContentReducer(
                entity.cellContents,
                tagDefinitionMap,
                action.tagDefinitionList,
                (cellContents, idTagDef) => strategy(cellContents, idEntity, idTagDef)
            )
        } else {
            // alter the similar entities
            const idx = entity.entityMap[idEntity]
            if (
                idx === undefined ||
                idEntity != entity.similarEntities.value[idx].idPersistent
            ) {
                continue
            }
            contributionTagInstanceCellContentReducer(
                entity.similarEntities.value[idx].cellContents,
                tagDefinitionMap,
                action.tagDefinitionList,
                (cellContents, idTagDef) => strategy(cellContents, idEntity, idTagDef)
            )
        }
    }
}
export function contributionTagInstanceCellContentReducer(
    cellContents: RemoteInterface<CellValue[]>[],
    tagDefinitionMap: { [key: string]: number },
    tagDefinitionList: TagDefinition[],
    strategy: (
        cellContents: RemoteInterface<CellValue[]>,
        idTagDefinitionPersistent: string
    ) => void
) {
    for (const tagDef of tagDefinitionList) {
        const idx = tagDefinitionMap[tagDef.idPersistent]
        if (idx !== undefined) {
            strategy(cellContents[idx], tagDef.idPersistent)
        }
    }
}

export const {
    completeEntityAssignmentClearError,
    completeEntityAssignmentError,
    completeEntityAssignmentStart,
    completeEntityAssignmentSuccess,
    getContributionEntitiesError,
    getContributionEntitiesStart,
    getContributionEntitiesSuccess,
    getContributionTagInstancesError,
    getContributionTagInstancesStart,
    getContributionTagInstancesSuccess,
    getDuplicatesError,
    getDuplicatesStart,
    getDuplicatesSuccess,
    putDuplicateError,
    putDuplicateStart,
    putDuplicateSuccess,
    toggleTagDefinitionMenu,
    setSelectedEntityIdx,
    incrementSelectedEntityIdx
} = contributionEntitySlice.actions
