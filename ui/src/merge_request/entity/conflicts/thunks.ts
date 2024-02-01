import { config } from '../../../config'
import { AppDispatch } from '../../../store'
import { Entity } from '../../../table/state'
import { addError, addSuccessVanish } from '../../../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../../../util/exception'
import { RemoteInterface, newRemote } from '../../../util/state'
import { ThunkWithFetch } from '../../../util/type'
import { parseTagInstanceFromJson } from '../../conflicts/async_actions'
import { TagInstance } from '../../conflicts/state'
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
    TagDefinition,
    newEntityMergeRequestConflict
} from './state'

export function getEntityMergeRequest(
    idEntityMergeRequest: string
): ThunkWithFetch<string | undefined> {
    return async (dispatch: AppDispatch, _getState, fetch) => {
        try {
            dispatch(getEntityMergeRequestStart())
            const rsp = await fetch(
                config.api_path + `/merge_requests/entities/${idEntityMergeRequest}`,
                {
                    credentials: 'include'
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const entityMergeRequest = parseEntityMergeRequestFromJson(json)
                dispatch(getEntityMergeRequestSuccess(entityMergeRequest))
                return json['id_persistent']
            } else {
                dispatch(addError(errorMessageFromApi(json)))
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
    return async (dispatch: AppDispatch, _getState, fetch) => {
        try {
            dispatch(putEntityMergeRequestStart())
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/entities/${idEntityOrigin}/${idEntityDestination}`,
                {
                    method: 'PUT',
                    credentials: 'include'
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const entityMergeRequest = parseEntityMergeRequestFromJson(json)
                dispatch(
                    putEntityMergeRequestSuccess({
                        newlyCreated: true,
                        mergeRequest: entityMergeRequest
                    })
                )
                return json['id_persistent']
            } else {
                dispatch(addError(errorMessageFromApi(json)))
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
    return async (dispatch: AppDispatch, _getState, fetch) => {
        try {
            dispatch(getEntityMergeRequestConflictsStart())
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/entities/${idEntityMergeRequest}/conflicts`,
                { credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const resolvableConflicts = json['resolvable_conflicts'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflictJson: any) =>
                        newRemote(parseEntityMergeRequestConflictFromJson(conflictJson))
                )
                const unresolvableConflicts = json['unresolvable_conflicts'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflictJson: any) =>
                        newRemote(parseEntityMergeRequestConflictFromJson(conflictJson))
                )
                const updated = json['updated'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflictJson: any) =>
                        newRemote(parseEntityMergeRequestConflictFromJson(conflictJson))
                )
                dispatch(
                    getEntityMergeRequestConflictsSuccess({
                        resolvableConflicts,
                        unresolvableConflicts,
                        updated,
                        resolvableConflictsTagDefinitionIdMap: Object.fromEntries(
                            resolvableConflicts.map(
                                (
                                    conflict: RemoteInterface<EntityMergeRequestConflict>,
                                    idx: number
                                ) => [conflict.value.tagDefinition.idPersistent, idx]
                            )
                        ),
                        updatedTagDefinitionIdMap: Object.fromEntries(
                            updated.map(
                                (
                                    conflict: RemoteInterface<EntityMergeRequestConflict>,
                                    idx: number
                                ) => [conflict.value.tagDefinition.idPersistent, idx]
                            )
                        )
                    })
                )
            } else {
                dispatch(getEntityMergeRequestConflictsError())
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(getEntityMergeRequestConflictsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function resolveEntityConflict({
    idMergeRequestPersistent,
    tagDefinition,
    tagInstanceOrigin,
    entityOrigin,
    tagInstanceDestination,
    entityDestination,
    replace
}: {
    idMergeRequestPersistent: string
    tagDefinition: TagDefinition
    tagInstanceOrigin: TagInstance
    entityOrigin: Entity
    tagInstanceDestination?: TagInstance
    entityDestination: Entity
    replace: boolean
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(resolveEntityConflictStart(tagDefinition.idPersistent))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/entities/${idMergeRequestPersistent}/resolve`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_tag_definition_version: tagDefinition.version,
                        id_entity_origin_version: entityOrigin.version,
                        id_tag_instance_origin_version: tagInstanceOrigin.version,
                        id_entity_destination_version: entityDestination.version,
                        id_tag_instance_destination_version:
                            tagInstanceDestination?.version,
                        id_tag_definition_persistent: tagDefinition.idPersistent,
                        id_entity_origin_persistent: entityOrigin.idPersistent,
                        id_tag_instance_origin_persistent:
                            tagInstanceOrigin.idPersistent,
                        id_entity_destination_persistent:
                            entityDestination.idPersistent,
                        id_tag_instance_destination_persistent:
                            tagInstanceDestination?.idPersistent,
                        replace: replace
                    })
                }
            )
            if (rsp.status == 200) {
                dispatch(
                    resolveEntityConflictSuccess([tagDefinition.idPersistent, replace])
                )
            } else {
                const json = await rsp.json()
                dispatch(resolveEntityConflictError(tagDefinition.idPersistent))
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(resolveEntityConflictError(tagDefinition.idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function reverseOriginDestination(
    idEntityMergeRequest: string
): ThunkWithFetch<EntityMergeRequest | undefined> {
    return async (dispatch, _getState, fetch) => {
        dispatch(reverseOriginDestinationStart(idEntityMergeRequest))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/entities/${idEntityMergeRequest}/reverse_origin_destination`,
                { credentials: 'include', method: 'POST' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const mergeRequest = parseEntityMergeRequestFromJson(json)
                dispatch(reverseOriginDestinationSuccess(mergeRequest))
                return mergeRequest
            } else {
                dispatch(reverseOriginDestinationError(idEntityMergeRequest))
                dispatch(addError(errorMessageFromApi(json)))
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
    return async (dispatch, _getState, fetch) => {
        dispatch(mergeEntityMergeRequestStart(idEntityMergeRequest))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/entities/${idEntityMergeRequest}/merge`,
                { method: 'POST', credentials: 'include' }
            )
            if (rsp.status == 200) {
                dispatch(mergeEntityMergeRequestSuccess(idEntityMergeRequest))
                dispatch(addSuccessVanish('Application of resolutions started.'))
                return
            }
            const json = await rsp.json()
            dispatch(addError(errorMessageFromApi(json)))
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
    return newEntityMergeRequestConflict({
        tagDefinition: parseTagDefinitionFromJson(conflictJson['tag_definition']),
        tagInstanceOrigin: parseTagInstanceFromJson(
            conflictJson['tag_instance_origin']
        ),
        tagInstanceDestination: parseTagInstanceFromJson(
            conflictJson['tag_instance_destination']
        ),
        replace: conflictJson['replace'] ?? undefined
    })
}

function parseTagDefinitionFromJson(tagDefJson: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}) {
    return {
        idPersistent: tagDefJson['id_persistent'],
        idParentPersistent: tagDefJson['id_parent_persistent'],
        namePath: tagDefJson['name_path'],
        version: tagDefJson['version'],
        curated: tagDefJson['curated']
    }
}
