import { AppDispatch } from '../../../store'
import { Entity } from '../../../entity/state'
import { addError, addSuccessVanish } from '../../../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../../../util/exception'
import { RemoteInterface, newRemote } from '../../../util/state'
import { ThunkWithFetch } from '../../../util/type'
import {
    parseValueFromJson,
    replacementStateJsonToAppDict
} from '../../conflicts/thunks'
import { ReplacementState, Value } from '../../conflicts/state'
import { EntityMergeRequest } from '../state'
import { parseEntityMergeRequestFromJson } from '../thunks'
import {
    getEntityMergeRequestConflictsError,
    getEntityMergeRequestConflictsStart,
    getEntityMergeRequestConflictsSuccess,
    putEntityMergeRequestError,
    putEntityMergeRequestStart,
    putEntityMergeRequestSuccess,
    getEntityMergeRequestStart,
    getEntityMergeRequestSuccess,
    getEntityMergeRequestError,
    resolveEntityConflictError,
    resolveEntityConflictStart,
    resolveEntityConflictSuccess,
    reverseOriginDestinationStart,
    reverseOriginDestinationError,
    reverseOriginDestinationSuccess,
    mergeEntityMergeRequestStart,
    mergeEntityMergeRequestSuccess,
    mergeEntityMergeRequestError
} from './slice'
import {
    EntityMergeRequestConflict,
    Column,
    newEntityMergeRequestConflict
} from './state'
import {
    cosmaeMergeRequestEntityApiGet,
    cosmaeMergeRequestEntityApiGetMergeRequestConflicts,
    cosmaeMergeRequestEntityApiPostMergeRequestMerge,
    cosmaeMergeRequestEntityApiPostResolveConflict,
    cosmaeMergeRequestEntityApiPut,
    cosmaeMergeRequestEntityApiReverseOriginDestination
} from '../../../openapi/cosmae'

export function getEntityMergeRequest(
    idEntityMergeRequest: string
): ThunkWithFetch<string | undefined> {
    return async (dispatch: AppDispatch, _getState, _fetch) => {
        try {
            dispatch(getEntityMergeRequestStart())
            const rsp = await cosmaeMergeRequestEntityApiGet({
                path: { id_merge_request_persistent: idEntityMergeRequest }
            })
            if (rsp.data) {
                const entityMergeRequest = parseEntityMergeRequestFromJson(rsp.data)
                dispatch(getEntityMergeRequestSuccess(entityMergeRequest))
                return rsp.data.id_persistent
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(getEntityMergeRequestError())
                return undefined
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        return undefined
    }
}
export function putEntityMergeRequest(
    idEntityOrigin: string,
    idEntityDestination: string
): ThunkWithFetch<string | undefined> {
    return async (dispatch: AppDispatch, _getState, _fetch) => {
        try {
            dispatch(putEntityMergeRequestStart())
            const rsp = await cosmaeMergeRequestEntityApiPut({
                path: {
                    id_entity_origin_persistent: idEntityOrigin,
                    id_entity_destination_persistent: idEntityDestination
                }
            })
            if (rsp.data) {
                const entityMergeRequest = parseEntityMergeRequestFromJson(rsp.data)
                dispatch(
                    putEntityMergeRequestSuccess({
                        newlyCreated: true,
                        mergeRequest: entityMergeRequest
                    })
                )
                return rsp.data.id_persistent
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(putEntityMergeRequestError())
                return undefined
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(putEntityMergeRequestError())
        }
        return undefined
    }
}
export function getEntityMergeRequestConflicts(
    idEntityMergeRequest: string
): ThunkWithFetch<void> {
    return async (dispatch: AppDispatch, _getState, _fetch) => {
        try {
            dispatch(getEntityMergeRequestConflictsStart())
            const resolvableConflicts: RemoteInterface<EntityMergeRequestConflict>[] =
                []
            const updated: RemoteInterface<EntityMergeRequestConflict>[] = []
            const unresolvableConflicts: RemoteInterface<EntityMergeRequestConflict>[] =
                []
            for (let offset = 0; offset >= 0; ) {
                const rsp = await cosmaeMergeRequestEntityApiGetMergeRequestConflicts({
                    path: { id_merge_request_persistent: idEntityMergeRequest },
                    query: { offset, limit: 30 }
                })
                if (rsp.data) {
                    const newUnresolvable = rsp.data.unresolvable_conflicts.map(
                        (conflictJson) =>
                            parseEntityMergeRequestConflictFromJson(conflictJson)
                    )
                    newUnresolvable.forEach((conflict) => {
                        unresolvableConflicts.push(newRemote(conflict))
                    })
                    const newUpdated = rsp.data.updated.map((conflictJson) =>
                        parseEntityMergeRequestConflictFromJson(conflictJson)
                    )
                    offset = rsp.data.next_offset
                    rsp.data.conflicts.forEach((conflictRsp) => {
                        const conflict =
                            parseEntityMergeRequestConflictFromJson(conflictRsp)

                        const updatedConflict = newUpdated.find(
                            (updated: EntityMergeRequestConflict) =>
                                updated.valueOrigin.idPersistent ==
                                conflict.valueOrigin.idPersistent
                        )
                        if (updatedConflict !== undefined) {
                            updated.push(newRemote(updatedConflict))
                            resolvableConflicts.push(newRemote(updatedConflict))
                        } else {
                            resolvableConflicts.push(newRemote(conflict))
                        }
                    })
                } else {
                    dispatch(getEntityMergeRequestConflictsError())
                    dispatch(addError(errorMessageFromApi(rsp.error)))
                    return
                }
            }
            dispatch(
                getEntityMergeRequestConflictsSuccess({
                    idMergeRequestPersistent: idEntityMergeRequest,
                    conflicts: {
                        resolvableConflicts,
                        unresolvableConflicts,
                        updated,
                        resolvableConflictsColumnIdMap: Object.fromEntries(
                            resolvableConflicts.map(
                                (
                                    conflict: RemoteInterface<EntityMergeRequestConflict>,
                                    idx: number
                                ) => [conflict.value.column.idPersistent, idx]
                            )
                        ),
                        updatedColumnIdMap: Object.fromEntries(
                            updated.map(
                                (
                                    conflict: RemoteInterface<EntityMergeRequestConflict>,
                                    idx: number
                                ) => [conflict.value.column.idPersistent, idx]
                            )
                        )
                    }
                })
            )
        } catch (e: unknown) {
            dispatch(getEntityMergeRequestConflictsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function resolveEntityConflict({
    idMergeRequestPersistent,
    column,
    valueOrigin,
    entityOrigin,
    valueDestination,
    entityDestination,
    replacementState,
    replacementValue
}: {
    idMergeRequestPersistent: string
    column: Column
    valueOrigin: Value
    entityOrigin: Entity
    valueDestination?: Value
    entityDestination: Entity
    replacementState?: ReplacementState
    replacementValue: string | undefined
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(resolveEntityConflictStart(column.idPersistent))
        try {
            const rsp = await cosmaeMergeRequestEntityApiPostResolveConflict({
                path: { id_merge_request_persistent: idMergeRequestPersistent },
                body: {
                    id_column_version: column.version,
                    id_entity_origin_version: entityOrigin.version,
                    id_value_origin_version: valueOrigin.version,
                    id_entity_destination_version: entityDestination.version,
                    id_value_destination_version: valueDestination?.version,
                    id_column_persistent: column.idPersistent,
                    id_entity_origin_persistent: entityOrigin.idPersistent,
                    id_value_origin_persistent: valueOrigin.idPersistent,
                    id_entity_destination_persistent: entityDestination.idPersistent,
                    id_value_destination_persistent: valueDestination?.idPersistent,
                    replacement_state: replacementState,
                    replacement_value: replacementValue
                }
            })
            if (!rsp.error) {
                dispatch(
                    resolveEntityConflictSuccess({
                        idColumnPersistent: column.idPersistent,
                        replacementState,
                        replacementValue
                    })
                )
            } else {
                dispatch(resolveEntityConflictError(column.idPersistent))
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(resolveEntityConflictError(column.idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function reverseOriginDestination(
    idEntityMergeRequest: string
): ThunkWithFetch<EntityMergeRequest | undefined> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(reverseOriginDestinationStart(idEntityMergeRequest))
        try {
            const rsp = await cosmaeMergeRequestEntityApiReverseOriginDestination({
                path: { id_merge_request_persistent: idEntityMergeRequest }
            })
            if (rsp.data) {
                const mergeRequest = parseEntityMergeRequestFromJson(rsp.data)
                dispatch(reverseOriginDestinationSuccess(mergeRequest))
                return mergeRequest
            } else {
                dispatch(reverseOriginDestinationError(idEntityMergeRequest))
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(reverseOriginDestinationError(idEntityMergeRequest))
            dispatch(addError(exceptionMessage(e)))
        }
        return undefined
    }
}
export function mergeEntityMergeRequest(
    idEntityMergeRequest: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(mergeEntityMergeRequestStart(idEntityMergeRequest))
        try {
            const rsp = await cosmaeMergeRequestEntityApiPostMergeRequestMerge({
                path: { id_merge_request_persistent: idEntityMergeRequest }
            })
            if (!rsp.error) {
                dispatch(mergeEntityMergeRequestSuccess(idEntityMergeRequest))
                dispatch(addSuccessVanish('Application of resolutions started.'))
                return
            }
            dispatch(addError(errorMessageFromApi(rsp.error)))
            dispatch(mergeEntityMergeRequestError(idEntityMergeRequest))
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(mergeEntityMergeRequestError(idEntityMergeRequest))
        }
    }
}
function parseEntityMergeRequestConflictFromJson(conflictJson: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}): EntityMergeRequestConflict {
    let valueDestination = undefined
    const destinationJson = conflictJson['value_destination']
    if (!(destinationJson === null || destinationJson === undefined)) {
        valueDestination = parseValueFromJson(destinationJson)
    }
    return newEntityMergeRequestConflict({
        column: parseColumnFromJson(conflictJson['column']),
        valueOrigin: parseValueFromJson(conflictJson['value_origin']),
        valueDestination: valueDestination,
        replacementState:
            replacementStateJsonToAppDict[conflictJson['replacement_state']],
        replacementValue: conflictJson['replacement_value'] ?? undefined
    })
}

function parseColumnFromJson(columnJson: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}): Column {
    return {
        idPersistent: columnJson['id_persistent'],
        idParentPersistent: columnJson['id_parent_persistent'],
        namePath: columnJson['name_path'],
        version: columnJson['version'],
        curated: columnJson['curated']
    }
}
