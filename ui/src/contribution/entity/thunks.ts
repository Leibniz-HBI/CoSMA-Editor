import { config } from '../../config'
import { exceptionMessage } from '../../util/exception'
import {
    EntityWithDuplicates,
    ScoredEntity,
    newEntityWithDuplicates,
    newScoredEntity,
    newTagInstance
} from './state'
import { fetch_chunk_get } from '../../util/fetch'
import { TagDefinition } from '../../column_menu/state'
import { parseEntityObjectFromJson } from '../../table/async_actions'
import { ThunkWithFetch } from '../../util/type'
import {
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
    putDuplicateSuccess
} from './slice'
import { newRemote } from '../../util/state'
import { addError, newErrorState } from '../../util/error/slice'

export function getContributionEntitiesAction(
    idContributionPersistent: string
): ThunkWithFetch<EntityWithDuplicates[]> {
    {
        return async (dispatch, _getState, fetch) => {
            dispatch(getContributionEntitiesStart())
            try {
                let entities: EntityWithDuplicates[] = []
                for (let i = 0; ; i += 500) {
                    const rsp = await fetch_chunk_get({
                        api_path:
                            config.api_path +
                            `/contributions/${idContributionPersistent}/entities/chunk`,
                        offset: i,
                        limit: 500,
                        fetchMethod: fetch
                    })
                    const json = await rsp.json()
                    if (rsp.status == 200) {
                        const entitiesChunk = json['persons'].map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (entityJson: any) =>
                                newEntityWithDuplicates({
                                    ...parseEntityObjectFromJson(entityJson),
                                    similarEntities: newRemote([])
                                })
                        )
                        entities = [...entities, ...entitiesChunk]
                        if (entitiesChunk.length == 0) {
                            dispatch(getContributionEntitiesSuccess(entities))
                            return entities
                        }
                    } else {
                        dispatch(getContributionEntitiesError())
                        dispatch(addError(newErrorState(json.msg)))
                        return []
                    }
                }
            } catch (exc: unknown) {
                dispatch(getContributionEntitiesError())
                dispatch(addError(newErrorState(exceptionMessage(exc))))
            }
            return []
        }
    }
}

export function putDuplicateAction({
    idContributionPersistent,
    idEntityOriginPersistent,
    idEntityDestinationPersistent
}: {
    idContributionPersistent: string
    idEntityOriginPersistent: string
    idEntityDestinationPersistent?: string
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(putDuplicateStart(idEntityOriginPersistent))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${idContributionPersistent}/entities/${idEntityOriginPersistent}/duplicate`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_entity_destination_persistent: idEntityDestinationPersistent
                    })
                }
            )
            if (rsp.status == 200) {
                const json = await rsp.json()
                const assignedDuplicateJson = json['assigned_duplicate']
                let assignedDuplicate = undefined
                if (
                    assignedDuplicateJson !== null &&
                    assignedDuplicateJson !== undefined
                ) {
                    assignedDuplicate = parseEntityObjectFromJson(assignedDuplicateJson)
                }
                dispatch(
                    putDuplicateSuccess({
                        idPersistent: idEntityOriginPersistent,
                        details: assignedDuplicate
                    })
                )
            } else {
                const json = await rsp.json()
                dispatch(
                    putDuplicateError({
                        idPersistent: idEntityOriginPersistent,
                        details: undefined
                    })
                )
                dispatch(addError(newErrorState(json['msg'])))
            }
        } catch (e: unknown) {
            dispatch(
                putDuplicateError({
                    idPersistent: idEntityOriginPersistent,
                    details: undefined
                })
            )
            dispatch(addError(newErrorState(exceptionMessage(e))))
        }
    }
}

export function getContributionEntityDuplicateCandidatesAction({
    idContributionPersistent,
    entityIdPersistentList
}: {
    idContributionPersistent: string
    entityIdPersistentList: string[]
}): ThunkWithFetch<{ [key: string]: string[] }> {
    return async (dispatch, _getState, fetch) => {
        try {
            for (const idEntityPersistent of entityIdPersistentList) {
                dispatch(getDuplicatesStart(idEntityPersistent))
            }
            const entitiesGroupMap: { [key: string]: string[] } = {}
            for (let idx = 0; idx < entityIdPersistentList.length; idx += 50) {
                const rsp = await fetch(
                    config.api_path +
                        `/contributions/${idContributionPersistent}/entities/similar`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        body: JSON.stringify({
                            id_entity_persistent_list: entityIdPersistentList.slice(
                                idx,
                                idx + 50
                            )
                        })
                    }
                )
                const json = await rsp.json()
                if (rsp.status == 200) {
                    const matchesMap = json['matches']
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    for (const idEntityPersistent in matchesMap) {
                        let assignedDuplicate =
                            matchesMap[idEntityPersistent]['assigned_duplicate']
                        if (
                            assignedDuplicate !== null &&
                            assignedDuplicate !== undefined
                        ) {
                            assignedDuplicate =
                                parseEntityObjectFromJson(assignedDuplicate)
                        } else {
                            assignedDuplicate = undefined
                        }
                        const matches = matchesMap[idEntityPersistent]['matches'].map(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (scoredEntity: any) =>
                                parseScoredEntityFromJson(scoredEntity)
                        )
                        entitiesGroupMap[idEntityPersistent] = [
                            idEntityPersistent,
                            ...matches.map((match: ScoredEntity) => match.idPersistent)
                        ]
                        dispatch(
                            getDuplicatesSuccess({
                                idPersistent: idEntityPersistent,
                                details: {
                                    scoredEntities: matches,
                                    assignedEntity: assignedDuplicate
                                }
                            })
                        )
                    }
                } else {
                    for (const idEntityPersistent of entityIdPersistentList.slice(
                        idx
                    )) {
                        dispatch(
                            getDuplicatesError({
                                idPersistent: idEntityPersistent,
                                details: undefined
                            })
                        )
                    }
                    dispatch(addError(newErrorState(json['msg'])))
                    break
                }
            }
            return entitiesGroupMap
        } catch (exc: unknown) {
            for (const idEntityPersistent of entityIdPersistentList) {
                dispatch(
                    getDuplicatesError({
                        idPersistent: idEntityPersistent,
                        details: undefined
                    })
                )
            }
            dispatch(addError(newErrorState(exceptionMessage(exc))))
        }
        return {}
    }
}

export function completeEntityAssignment(
    idContributionPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(completeEntityAssignmentStart())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${idContributionPersistent}/entity_assignment_complete`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            )
            if (rsp.status == 200) {
                dispatch(completeEntityAssignmentSuccess())
            } else {
                const json = await rsp.json()
                dispatch(completeEntityAssignmentError(json['msg']))
            }
        } catch (exc: unknown) {
            dispatch(completeEntityAssignmentError(exceptionMessage(exc)))
        }
    }
}

export function getContributionTagInstances({
    entitiesGroupMap,
    tagDefinitionList,
    idContributionPersistent = undefined,
    idMergeRequestPersistent = undefined
}: {
    entitiesGroupMap: { [key: string]: string[] }
    tagDefinitionList: TagDefinition[]
    idContributionPersistent?: string
    idMergeRequestPersistent?: string
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            dispatch(
                getContributionTagInstancesStart({
                    idEntityPersistentGroupMap: entitiesGroupMap,
                    tagDefinitionList,
                    details: undefined
                })
            )
            const entitiesSet = new Set<string>()
            for (const [_idEntity, entityGroupList] of Object.entries(
                entitiesGroupMap
            )) {
                for (const idEntity of entityGroupList) {
                    entitiesSet.add(idEntity)
                }
            }
            const rsp = await fetch(config.api_path + '/tags/entities', {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    id_tag_definition_persistent_list: tagDefinitionList.map(
                        (tagDef) => tagDef.idPersistent
                    ),
                    id_entity_persistent_list: Array.from(entitiesSet),
                    id_contribution_persistent: idContributionPersistent,
                    id_merge_request_persistent: idMergeRequestPersistent
                })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(
                    getContributionTagInstancesSuccess({
                        idEntityPersistentGroupMap: entitiesGroupMap,
                        tagDefinitionList,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        details: json['value_responses'].map((instance: any) =>
                            parseTagInstanceFromJson(instance)
                        )
                    })
                )
            } else {
                dispatch(
                    getContributionTagInstancesError({
                        idEntityPersistentGroupMap: entitiesGroupMap,
                        tagDefinitionList,
                        details: undefined
                    })
                )
                dispatch(addError(newErrorState(json['msg'])))
            }
        } catch (e: unknown) {
            dispatch(
                getContributionTagInstancesError({
                    idEntityPersistentGroupMap: entitiesGroupMap,
                    tagDefinitionList,
                    details: undefined
                })
            )
            dispatch(addError(newErrorState(exceptionMessage(e))))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseScoredEntityFromJson(json: any): ScoredEntity {
    return newScoredEntity({
        ...parseEntityObjectFromJson(json['entity']),
        similarity: json['similarity'],
        idMatchTagDefinitionPersistentList:
            json['id_match_tag_definition_persistent_list']
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTagInstanceFromJson(json: any) {
    const idTagDefinitionPersistent =
        json['id_tag_definition_requested_persistent'] ??
        json['id_tag_definition_persistent']
    return newTagInstance(json['id_entity_persistent'], idTagDefinitionPersistent, {
        value: json['value'],
        idPersistent: json['id_persistent'],
        version: json['version'],
        isExisting: json['is_existing'],
        isRequested: json['id_tag_definition_persistent'] == idTagDefinitionPersistent
    })
}
