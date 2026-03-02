import { errorMessageFromApi, exceptionMessage } from '../../util/exception'
import {
    DiscardableScoredEntity,
    EntityWithDuplicates,
    ScoredEntity,
    newEntityWithDuplicates,
    newScoredEntity,
    newValue
} from './state'
import { Column } from '../../column_menu/state'
import { parseEntityObjectFromJson } from '../../table/thunks'
import { ThunkWithFetch } from '../../util/type'
import {
    completeEntityAssignmentError,
    completeEntityAssignmentStart,
    completeEntityAssignmentSuccess,
    getAdditionalEntityScoreError,
    getAdditionalEntityScoreStart,
    getAdditionalEntityScoreSuccess,
    getContributionEntitiesError,
    getContributionEntitiesStart,
    getContributionEntitiesSuccess,
    getContributionValuesError,
    getContributionValuesStart,
    getContributionValuesSuccess,
    getDuplicatesError,
    getDuplicatesStart,
    getDuplicatesSuccess,
    openJustificationInput,
    putDuplicateError,
    putDuplicateStart,
    putDuplicateSuccess
} from './slice'
import { newRemote } from '../../util/state'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import { setJustificationOfContribution } from '../slice'
import {
    cosmaeContributionApiPostCompleteEntityAssignment,
    cosmaeContributionEntityApiGetEntities,
    cosmaeContributionEntityApiGetScore,
    cosmaeContributionEntityApiPostSimilar,
    cosmaeContributionEntityApiPutDuplicateAssignment,
    cosmaeValueApiPostValuesForEntities
} from '../../openapi/cosmae'

export function getContributionEntitiesAction(
    idContributionPersistent: string
): ThunkWithFetch<EntityWithDuplicates[]> {
    {
        return async (dispatch, _getState, _fetch) => {
            dispatch(getContributionEntitiesStart())
            try {
                let entities: EntityWithDuplicates[] = []
                for (let offset = 0; ; ) {
                    const rsp = await cosmaeContributionEntityApiGetEntities({
                        path: {
                            start: offset,
                            offset: 500,
                            id_contribution_persistent: idContributionPersistent
                        }
                    })
                    if (rsp.data) {
                        const entitiesChunk = rsp.data.entity_list.map(
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
                        offset = rsp.data.next_offset
                    } else {
                        dispatch(getContributionEntitiesError())
                        dispatch(addError(rsp.error.msg))
                        return []
                    }
                }
            } catch (exc: unknown) {
                dispatch(getContributionEntitiesError())
                dispatch(addError(exceptionMessage(exc)))
            }
            return []
        }
    }
}

export function putDuplicateAction({
    idContributionPersistent,
    idEntityOriginPersistent,
    idEntityDestinationPersistent,
    justificationTxt,
    keepJustificationForAll,
    discard = undefined
}: {
    idContributionPersistent: string
    idEntityOriginPersistent: string
    idEntityDestinationPersistent?: string
    justificationTxt?: string
    keepJustificationForAll?: boolean
    discard?: boolean | undefined
}): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(putDuplicateStart(idEntityOriginPersistent))
        try {
            const rsp = await cosmaeContributionEntityApiPutDuplicateAssignment({
                body: {
                    id_entity_destination_persistent: idEntityDestinationPersistent,
                    justification_txt: justificationTxt,
                    keep_justification_for_all: keepJustificationForAll,
                    discard
                },
                path: {
                    id_entity_origin_persistent: idEntityOriginPersistent,
                    id_contribution_persistent: idContributionPersistent
                }
            })
            if (rsp.data !== undefined) {
                const assignedDuplicateJson = rsp.data.assigned_duplicate
                const discard = rsp.data.discard
                let assignedDuplicate = undefined
                if (
                    assignedDuplicateJson !== null &&
                    assignedDuplicateJson !== undefined
                ) {
                    assignedDuplicate = parseScoredEntityFromJson(assignedDuplicateJson)
                }
                dispatch(
                    putDuplicateSuccess({
                        idPersistent: idEntityOriginPersistent,
                        details: { assignedDuplicate, discard }
                    })
                )
                if (keepJustificationForAll && justificationTxt !== undefined) {
                    dispatch(
                        setJustificationOfContribution({
                            idContributionPersistent,
                            justification: justificationTxt
                        })
                    )
                }
                return true
            } else if (rsp.error.msg == 'Entity justification required.') {
                dispatch(openJustificationInput())
                return false
            }
            dispatch(
                putDuplicateError({
                    idPersistent: idEntityOriginPersistent,
                    details: undefined
                })
            )
            dispatch(addError(rsp.error.msg))
        } catch (e: unknown) {
            dispatch(
                putDuplicateError({
                    idPersistent: idEntityOriginPersistent,
                    details: undefined
                })
            )
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function getContributionEntityDuplicateCandidatesAction({
    idContributionPersistent,
    entityIdPersistentList
}: {
    idContributionPersistent: string
    entityIdPersistentList: string[]
}): ThunkWithFetch<{ [key: string]: string[] }> {
    return async (dispatch, _getState, _fetch) => {
        try {
            for (const idEntityPersistent of entityIdPersistentList) {
                dispatch(getDuplicatesStart(idEntityPersistent))
            }
            const entitiesGroupMap: { [key: string]: string[] } = {}
            let offset = 4
            for (let idx = 0; idx < entityIdPersistentList.length; idx += offset) {
                const rsp = await cosmaeContributionEntityApiPostSimilar({
                    body: {
                        id_entity_persistent_list: entityIdPersistentList.slice(
                            idx,
                            idx + offset
                        )
                    },
                    path: { id_contribution_persistent: idContributionPersistent }
                })
                offset = Math.min(offset*2, 32)
                if (rsp.data !== undefined) {
                    const matchesMap = rsp.data.matches
                    for (const idEntityPersistent in matchesMap) {
                        const match = matchesMap[idEntityPersistent]
                        const assignedDuplicateRsp = match.assigned_duplicate
                        let assignedDuplicate: DiscardableScoredEntity | undefined =
                            undefined
                        if (
                            assignedDuplicateRsp !== null &&
                            assignedDuplicateRsp !== undefined
                        ) {
                            assignedDuplicate = {
                                assignedDuplicate:
                                    parseScoredEntityFromJson(assignedDuplicateRsp),
                                discard: false
                            }
                        } else {
                            assignedDuplicate = {
                                assignedDuplicate: undefined,
                                discard: match.discard
                            }
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
                    dispatch(addError(rsp.error.msg))
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
            dispatch(addError(exceptionMessage(exc)))
        }
        return {}
    }
}

export function completeEntityAssignment(
    idContributionPersistent: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(completeEntityAssignmentStart())
        try {
            const rsp = await cosmaeContributionApiPostCompleteEntityAssignment({
                path: { id_persistent: idContributionPersistent }
            })
            if (rsp.response.status == 200) {
                dispatch(completeEntityAssignmentSuccess())
                dispatch(addSuccessVanish('Duplicates successfully assigned.'))
                return true
            } else {
                dispatch(completeEntityAssignmentError())
                if (rsp.error !== undefined) {
                    dispatch(addError(rsp.error.msg))
                }
            }
        } catch (exc: unknown) {
            dispatch(completeEntityAssignmentError())
            dispatch(addError(exceptionMessage(exc)))
        }
        return false
    }
}

export function getContributionValues({
    entitiesGroupMap,
    columnList,
    idContributionPersistent = undefined,
    idMergeRequestPersistent = undefined
}: {
    entitiesGroupMap: { [key: string]: string[] }
    columnList: Column[]
    idContributionPersistent?: string
    idMergeRequestPersistent?: string
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            dispatch(
                getContributionValuesStart({
                    idEntityPersistentGroupMap: entitiesGroupMap,
                    columnList,
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
            const rsp = await cosmaeValueApiPostValuesForEntities({
                body: {
                    id_column_persistent_list: columnList.map(
                        (column) => column.idPersistent
                    ),
                    id_entity_persistent_list: Array.from(entitiesSet),
                    id_contribution_persistent: idContributionPersistent,
                    id_merge_request_persistent: idMergeRequestPersistent
                }
            })
            if (rsp.data) {
                dispatch(
                    getContributionValuesSuccess({
                        idEntityPersistentGroupMap: entitiesGroupMap,
                        columnList,
                        details: rsp.data.value_responses.map((instance) =>
                            parseValueFromJson(instance)
                        )
                    })
                )
            } else {
                dispatch(
                    getContributionValuesError({
                        idEntityPersistentGroupMap: entitiesGroupMap,
                        columnList,
                        details: undefined
                    })
                )
                dispatch(addError(rsp.error.msg))
            }
        } catch (e: unknown) {
            dispatch(
                getContributionValuesError({
                    idEntityPersistentGroupMap: entitiesGroupMap,
                    columnList,
                    details: undefined
                })
            )
            dispatch(addError(exceptionMessage(e)))
            throw e
        }
    }
}

export function getAdditionalEntityScoreThunk(
    idContributionPersistent: string,
    idEntityContributionPersistent: string,
    idEntityExistingPersistent: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getAdditionalEntityScoreStart())
        try {
            const rsp = await cosmaeContributionEntityApiGetScore({
                path: { id_contribution_persistent: idContributionPersistent },
                query: {
                    id_entity_contribution_persistent: idEntityContributionPersistent,
                    id_entity_existing_persistent: idEntityExistingPersistent
                }
            })
            if (rsp.data) {
                const scoredEntity = parseScoredEntityFromJson(rsp.data)
                dispatch(
                    getAdditionalEntityScoreSuccess({
                        match: scoredEntity,
                        idEntityContribution: idEntityContributionPersistent
                    })
                )
                return true
            } else {
                dispatch(getAdditionalEntityScoreError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(getAdditionalEntityScoreError())
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseScoredEntityFromJson(json: any): ScoredEntity {
    return newScoredEntity({
        ...parseEntityObjectFromJson(json['entity']),
        similarity: json['similarity'],
        idMatchColumnPersistentList: json['id_match_column_persistent_list'] ?? []
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseValueFromJson(json: any) {
    const idColumnPersistent =
        json['id_column_requested_persistent'] ?? json['id_column_persistent']
    return newValue(json['id_entity_persistent'], idColumnPersistent, {
        value: json['value'],
        idPersistent: json['id_persistent'],
        version: json['version'],
        isExisting: json['is_existing'],
        isRequested: json['id_column_persistent'] == idColumnPersistent
    })
}
