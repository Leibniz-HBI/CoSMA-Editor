import { exceptionMessage } from '../../util/exception'
import { config } from '../../config'
import { TagInstance, newMergeRequestConflict, newTagInstance } from './state'
import { parseEntityObjectFromJson } from '../../table/async_actions'
import { Entity } from '../../table/state'
import { TagDefinition } from '../../column_menu/state'
import { parseMergeRequestFromJson } from '../thunks'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import { ThunkWithFetch } from '../../util/type'
import {
    getMergeRequestConflictError,
    getMergeRequestConflictStart,
    getMergeRequestConflictSuccess,
    resolveConflictError,
    resolveConflictStart,
    resolveConflictSuccess,
    startMergeError,
    startMergeStart,
    startMergeSuccess,
    toggleDisableOnMergeError,
    toggleDisableOnMergeStart,
    toggleDisableOnMergeSuccess
} from './slice'

export function getMergeRequestConflicts(
    idMergeRequestPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getMergeRequestConflictStart())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/${idMergeRequestPersistent}/conflicts`,
                {
                    credentials: 'include'
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const updated = json['updated'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflict: any) => parseMergeRequestConflictFromApi(conflict)
                )
                const conflicts = json['conflicts'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflict: any) => parseMergeRequestConflictFromApi(conflict)
                )
                const mergeRequest = parseMergeRequestFromJson(json['merge_request'])
                dispatch(
                    getMergeRequestConflictSuccess({
                        updated,
                        conflicts,
                        mergeRequest
                    })
                )
            } else {
                const msg = json['msg']
                dispatch(getMergeRequestConflictError())
                dispatch(addError(msg))
            }
        } catch (e: unknown) {
            dispatch(getMergeRequestConflictError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function resolveConflict({
    idMergeRequestPersistent,
    entity,
    tagInstanceOrigin,
    tagDefinitionOrigin,
    tagInstanceDestination,
    tagDefinitionDestination,
    replace
}: {
    idMergeRequestPersistent: string
    entity: Entity
    tagInstanceOrigin: TagInstance
    tagDefinitionOrigin: TagDefinition
    tagInstanceDestination?: TagInstance
    tagDefinitionDestination: TagDefinition
    replace: boolean
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(resolveConflictStart(entity.idPersistent))
        try {
            const rsp = await fetch(
                config.api_path + `/merge_requests/${idMergeRequestPersistent}/resolve`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_entity_version: entity.version,
                        id_tag_definition_origin_version: tagDefinitionOrigin.version,
                        id_tag_instance_origin_version: tagInstanceOrigin.version,
                        id_tag_definition_destination_version:
                            tagDefinitionDestination.version,
                        id_tag_instance_destination_version:
                            tagInstanceDestination?.version,
                        id_entity_persistent: entity.idPersistent,
                        id_tag_definition_origin_persistent:
                            tagDefinitionOrigin.idPersistent,
                        id_tag_instance_origin_persistent:
                            tagInstanceOrigin.idPersistent,
                        id_tag_definition_destination_persistent:
                            tagDefinitionDestination.idPersistent,
                        id_tag_instance_destination_persistent:
                            tagInstanceDestination?.idPersistent,
                        replace: replace
                    })
                }
            )
            if (rsp.status == 200) {
                dispatch(
                    resolveConflictSuccess({
                        idEntityPersistent: entity.idPersistent,
                        replace
                    })
                )
            } else {
                const json = await rsp.json()
                dispatch(resolveConflictError(entity.idPersistent))
                dispatch(addError(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(resolveConflictError(entity.idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMergeRequestConflictFromApi(json: any) {
    const tagInstanceDestinationJson = json['tag_instance_destination']
    const tagInstanceDestination =
        tagInstanceDestinationJson === null
            ? undefined
            : parseTagInstanceFromJson(tagInstanceDestinationJson)
    return newMergeRequestConflict({
        entity: parseEntityObjectFromJson(json['entity']),
        tagInstanceOrigin: parseTagInstanceFromJson(json['tag_instance_origin']),
        tagInstanceDestination: tagInstanceDestination,
        replace: json['replace'] ?? undefined
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTagInstanceFromJson(json: any) {
    return newTagInstance({
        idPersistent: json['id_persistent'],
        version: json['version'],
        value: json['value']
    })
}

export function startMerge(idMergeRequestPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(startMergeStart())
        try {
            const rsp = await fetch(
                config.api_path + `/merge_requests/${idMergeRequestPersistent}/merge`,
                {
                    credentials: 'include',
                    method: 'POST'
                }
            )
            if (rsp.status == 200) {
                dispatch(startMergeSuccess())
                dispatch(addSuccessVanish('Application of resolutions started.'))
            } else {
                const json = await rsp.json()
                let msg = json['msg']
                if (
                    msg ==
                        'There are conflicts for the merge request, where the underlying data has changed.' ||
                    msg == 'There are unresolved conflicts for the merge request.'
                ) {
                    msg = msg + ' Reload the page to see the changes.'
                }
                dispatch(startMergeError())
                dispatch(addError(msg))
            }
        } catch (e: unknown) {
            dispatch(startMergeError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function toggleDisableOriginOnMerge(
    idMergeRequestPersistent: string,
    disableOriginOnMerge: boolean
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(toggleDisableOnMergeStart())
        try {
            const rsp = await fetch(
                config.api_path + `/merge_requests/${idMergeRequestPersistent}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({
                        disable_origin_on_merge: disableOriginOnMerge
                    })
                }
            )
            if (rsp.status == 200) {
                dispatch(toggleDisableOnMergeSuccess(disableOriginOnMerge))
            } else {
                const msg = (await rsp.json())['msg']
                dispatch(addError(msg))
                dispatch(toggleDisableOnMergeError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(toggleDisableOnMergeError())
        }
    }
}
