import { CellValue } from '../../table/state'
import { Remote } from '../../util/state'
import {
    LoadContributionDetailsAction,
    LoadContributionDetailsErrorAction,
    LoadContributionDetailsStartAction,
    LoadContributionDetailsSuccessAction
} from '../details/action'
import {
    CompleteEntityAssignmentClearErrorAction,
    CompleteEntityAssignmentErrorAction,
    CompleteEntityAssignmentStartAction,
    CompleteEntityAssignmentSuccessAction,
    ContributionEntityAction,
    GetContributionEntitiesErrorAction,
    GetContributionEntitiesStartAction,
    GetContributionEntitiesSuccessAction,
    GetContributionEntityDuplicatesAction,
    GetContributionEntityDuplicatesErrorAction,
    GetContributionEntityDuplicatesStartAction,
    GetContributionEntityDuplicatesSuccessAction,
    GetContributionTagInstancesAction,
    GetContributionTagInstancesErrorAction,
    GetContributionTagInstancesStartAction,
    GetContributionTagInstancesSuccessAction,
    PutDuplicateClearErrorAction,
    PutDuplicateErrorAction,
    PutDuplicateStartAction,
    PutDuplicateSuccessAction,
    SetPageNumberAction,
    ToggleTagDefinitionMenuAction
} from './action'
import {
    ContributionEntityState,
    EntityWithDuplicates,
    ScoredEntity,
    TagInstance
} from './state'

export function contributionEntityReducer(
    state: ContributionEntityState,
    action: ContributionEntityAction | LoadContributionDetailsAction
) {
    if (action instanceof SetPageNumberAction) {
        return new ContributionEntityState({ ...state, pageNumber: action.pageNumber })
    }
    if (action instanceof GetContributionEntityDuplicatesAction) {
        const idx = state.entityMap.get(action.idPersistent)
        if (
            idx === undefined ||
            state.entities.value[idx].idPersistent != action.idPersistent
        ) {
            return state
        }
        return new ContributionEntityState({
            ...state,
            entities: state.entities.map((entities) => [
                ...entities.slice(0, idx),
                contributionEntityDuplicateReducer(entities[idx], action),
                ...entities.slice(idx + 1)
            ])
        })
    }
    if (action instanceof GetContributionTagInstancesAction) {
        let newTagDefinitionMap = state.tagDefinitionMap
        let newTagDefinitions = state.tagDefinitions
        if (action instanceof GetContributionTagInstancesStartAction) {
            newTagDefinitionMap = new Map(newTagDefinitionMap)
            newTagDefinitions = [...newTagDefinitions]
            for (const tagDef of action.tagDefinitionList) {
                if (!newTagDefinitionMap.has(tagDef.idPersistent)) {
                    newTagDefinitions.push(tagDef)
                    newTagDefinitionMap.set(
                        tagDef.idPersistent,
                        newTagDefinitionMap.size
                    )
                }
            }
        }
        const newEntities = new Remote(
            contributionTagInstanceReducer(
                state.entities.value,
                state.entityMap,
                newTagDefinitionMap,
                action
            )
        )
        return new ContributionEntityState({
            ...state,
            entities: newEntities,
            tagDefinitionMap: newTagDefinitionMap,
            tagDefinitions: newTagDefinitions
        })
    }
    if (action instanceof ToggleTagDefinitionMenuAction) {
        return new ContributionEntityState({
            ...state,
            showTagDefinitionMenu: !state.showTagDefinitionMenu
        })
    }
    if (action instanceof GetContributionEntitiesStartAction) {
        return new ContributionEntityState({
            ...state,
            entities: state.entities.startLoading()
        })
    }
    if (action instanceof GetContributionEntitiesSuccessAction) {
        return new ContributionEntityState({
            ...state,
            entities: state.entities.success(action.entities),
            entityMap: undefined
        })
    }
    if (action instanceof GetContributionEntitiesErrorAction) {
        return new ContributionEntityState({
            ...state,
            entities: state.entities.withError(action.msg)
        })
    }
    if (action instanceof LoadContributionDetailsStartAction) {
        return new ContributionEntityState({
            ...state,
            contributionCandidate: state.contributionCandidate.startLoading()
        })
    }
    if (action instanceof LoadContributionDetailsSuccessAction) {
        return new ContributionEntityState({
            ...state,
            contributionCandidate: state.contributionCandidate.success(
                action.contribution
            )
        })
    }
    if (action instanceof LoadContributionDetailsErrorAction) {
        return new ContributionEntityState({
            ...state,
            contributionCandidate: state.contributionCandidate.withError(action.msg)
        })
    }
    if (action instanceof CompleteEntityAssignmentStartAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: state.completeEntityAssignment.startLoading()
        })
    }
    if (action instanceof CompleteEntityAssignmentSuccessAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: state.completeEntityAssignment.success(true)
        })
    }
    if (action instanceof CompleteEntityAssignmentErrorAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: new Remote(false, false, action.msg)
        })
    }
    if (action instanceof CompleteEntityAssignmentClearErrorAction) {
        return new ContributionEntityState({
            ...state,
            completeEntityAssignment: state.completeEntityAssignment.withoutError()
        })
    }
    return state
}

export function contributionEntityDuplicateReducer(
    state: EntityWithDuplicates,
    action: GetContributionEntityDuplicatesAction
) {
    if (action instanceof PutDuplicateStartAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.startLoading()
        })
    }
    if (action instanceof PutDuplicateSuccessAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.success(action.assignedDuplicate)
        })
    }
    if (action instanceof PutDuplicateErrorAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.withError(action.msg)
        })
    }
    if (action instanceof PutDuplicateClearErrorAction) {
        return new EntityWithDuplicates({
            ...state,
            assignedDuplicate: state.assignedDuplicate.withoutError()
        })
    }
    if (action instanceof GetContributionEntityDuplicatesStartAction) {
        return new EntityWithDuplicates({
            ...state,
            similarEntities: state.similarEntities.startLoading()
        })
    }
    if (action instanceof GetContributionEntityDuplicatesSuccessAction) {
        return new EntityWithDuplicates({
            ...state,
            similarEntities: state.similarEntities.success(action.scoredEntities),
            assignedDuplicate: new Remote(action.assignedDuplicate),
            entityMap: undefined
        })
    }
    if (action instanceof GetContributionEntityDuplicatesErrorAction) {
        return new EntityWithDuplicates({
            ...state,
            similarEntities: state.similarEntities.withError(action.msg)
        })
    }
    return state
}

export function contributionTagInstanceReducer(
    entities: EntityWithDuplicates[],
    entitiesMap: Map<string, number>,
    tagDefinitionMap: Map<string, number>,
    action: GetContributionTagInstancesAction
) {
    let entityGroupMap = undefined
    if (action instanceof GetContributionTagInstancesSuccessAction) {
        // Need to invert the grouping of the action to correctly assign instances.
        const reverseEntityGroupMap = new Map<string, string[]>()
        for (const [idEntityGroup, idEntityList] of action.idEntityPersistentGroupMap) {
            for (const idEntity of idEntityList) {
                const reverseGroupList = reverseEntityGroupMap.get(idEntity)
                if (reverseGroupList === undefined) {
                    reverseEntityGroupMap.set(idEntity, [idEntityGroup])
                } else {
                    reverseGroupList.push(idEntityGroup)
                }
            }
        }

        // Three layer hierarchy. First is for entity group.
        // Second for actual entity and third for tag definition
        entityGroupMap = new Map<string, Map<string, Map<string, TagInstance[]>>>()
        for (const instance of action.instances) {
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
                                new Map([
                                    [instance.idTagDefinitionPersistent, [instance]]
                                ])
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
    }
    const newEntities = [...entities]
    // use keys of action to get all groups even if there is no data
    for (const idEntityGroup of action.idEntityPersistentGroupMap.keys()) {
        // but get values from grouped data
        const idx = entitiesMap.get(idEntityGroup)
        if (idx !== undefined) {
            newEntities.splice(
                idx,
                1,
                contributionTagInstanceEntityReducer(
                    newEntities[idx],
                    action,
                    tagDefinitionMap,
                    entityGroupMap?.get(idEntityGroup)
                )
            )
        }
    }
    return newEntities
}

export function contributionTagInstanceEntityReducer(
    entity: EntityWithDuplicates,
    action: GetContributionTagInstancesAction,
    tagDefinitionMap: Map<string, number>,
    entityInstanceMap?: Map<string, Map<string, TagInstance[]>>
) {
    // create a new object that can be mutated.
    const newEntityObject = {
        ...entity,
        similarEntities: new Remote([...entity.similarEntities.value])
    }
    // get all relevant idEntityPersistent for this entity.
    const idEntityGroup =
        action.idEntityPersistentGroupMap.get(entity.idPersistent) ?? []
    for (const idEntity of idEntityGroup) {
        if (idEntity == entity.idPersistent) {
            newEntityObject.cellContents = contributionTagInstanceCellContentReducer(
                entity.cellContents,
                action,
                tagDefinitionMap,
                entityInstanceMap?.get(idEntity)
            )
        } else {
            const idx = entity.entityMap.get(idEntity)
            if (
                idx === undefined ||
                idEntity != entity.similarEntities.value[idx].idPersistent
            ) {
                continue
            }
            newEntityObject.similarEntities = newEntityObject.similarEntities.map(
                (similarEntities) => [
                    ...similarEntities.slice(0, idx),
                    new ScoredEntity({
                        ...similarEntities[idx],
                        cellContents: contributionTagInstanceCellContentReducer(
                            similarEntities[idx].cellContents,
                            action,
                            tagDefinitionMap,
                            entityInstanceMap?.get(idEntity)
                        )
                    }),
                    ...similarEntities.slice(idx + 1)
                ]
            )
        }
    }
    return new EntityWithDuplicates(newEntityObject)
}

export function contributionTagInstanceCellContentReducer(
    cellContents: Remote<CellValue[]>[],
    action: GetContributionTagInstancesAction,
    tagDefinitionMap: Map<string, number>,
    instanceMap?: Map<string, TagInstance[]>
) {
    const newCellContents = [...cellContents]
    if (action instanceof GetContributionTagInstancesStartAction) {
        for (const idTagDef of action.tagDefinitionList) {
            const idx = tagDefinitionMap?.get(idTagDef.idPersistent)
            if (idx === undefined) {
                continue
            }
            newCellContents.splice(idx, 1, new Remote([], true))
        }
        return newCellContents
    }
    if (action instanceof GetContributionTagInstancesSuccessAction) {
        if (instanceMap === undefined) {
            for (const tagDef of action.tagDefinitionList) {
                const idx = tagDefinitionMap.get(tagDef.idPersistent)
                if (idx !== undefined) {
                    newCellContents.splice(idx, 1, new Remote(cellContents[idx].value))
                }
            }
            return newCellContents
        }
        for (const tagDef of action.tagDefinitionList) {
            const idx = tagDefinitionMap.get(tagDef.idPersistent)
            if (idx === undefined) {
                continue
            }
            const tagInstances = instanceMap.get(tagDef.idPersistent) ?? []
            const cellValues = tagInstances.map((instance) => instance.cellValue)
            newCellContents.splice(idx, 1, new Remote(cellValues, false))
        }
        return newCellContents
    }
    if (action instanceof GetContributionTagInstancesErrorAction) {
        for (const tagDef of action.tagDefinitionList) {
            const idx = tagDefinitionMap?.get(tagDef.idPersistent)
            if (idx === undefined) {
                continue
            }
            newCellContents.splice(idx, 1, new Remote([], false, action.msg))
        }
        return newCellContents
    }
    return cellContents
}
