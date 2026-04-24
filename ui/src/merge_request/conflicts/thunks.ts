import { exceptionMessage } from '../../util/exception'
import {
    MergeRequestConflict,
    ReplacementState,
    Value,
    newMergeRequestConflict,
    newValue
} from './state'
import { parseEntityObjectFromJson } from '../../table/thunks'
import { Entity } from '../../entity/state'
import { Column } from '../../column_menu/state'
import { parseMergeRequestFromJson } from '../thunks'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import { ThunkWithFetch } from '../../util/type'
import {
    getMergeRequestConflictError,
    getMergeRequestConflictStart,
    getMergeRequestConflictSuccess,
    getMergeRequestError,
    getMergeRequestStart,
    getMergeRequestSuccess,
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
import {
    cosmaeMergeRequestApiGetMergeRequestConflicts,
    cosmaeMergeRequestApiPatchMergeRequest,
    cosmaeMergeRequestApiPostMergeRequestMerge,
    cosmaeMergeRequestApiPostResolveConflict,
    cosmaeMergeRequestApiGetMergeRequest
} from '../../openapi/cosmae'

export function getMergeRequest(
    idMergeRequestPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getMergeRequestStart())
        try {
            const rsp = await cosmaeMergeRequestApiGetMergeRequest({
                path: { id_persistent: idMergeRequestPersistent }
            })
            if (rsp.data) {
                const mergeRequest = parseMergeRequestFromJson(rsp.data)
                dispatch(getMergeRequestSuccess(mergeRequest))
            } else {
                const msg = rsp.error.msg
                dispatch(getMergeRequestConflictError())
                dispatch(addError(msg))
                return
            }
        } catch (e: unknown) {
            dispatch(getMergeRequestError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getMergeRequestConflicts(
    idMergeRequestPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getMergeRequestConflictStart())
        try {
            const conflicts: MergeRequestConflict[] = []
            const updated: MergeRequestConflict[] = []
            for (let offset = 0; offset >= 0; ) {
                const rsp = await cosmaeMergeRequestApiGetMergeRequestConflicts({
                    path: { id_merge_request_persistent: idMergeRequestPersistent },
                    query: { offset, limit: 10 }
                })
                if (rsp.data) {
                    const updatedSet = new Set(
                        rsp.data.id_value_origin_persistent_updated_list
                    )
                    rsp.data.conflicts.forEach(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (conflictRsp: any) => {
                            const conflict =
                                parseMergeRequestConflictFromApi(conflictRsp)
                            conflicts.push(conflict)
                            if (updatedSet.has(conflict.valueOrigin.idPersistent)) {
                                updated.push(conflict)
                            }
                        }
                    )
                    offset = rsp.data.next_offset
                } else {
                    const msg = rsp.error.msg
                    dispatch(getMergeRequestConflictError())
                    dispatch(addError(msg))
                    return
                }
            }
            dispatch(
                getMergeRequestConflictSuccess({
                    updated,
                    conflicts
                })
            )
        } catch (e: unknown) {
            dispatch(getMergeRequestConflictError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function resolveConflict({
    idMergeRequestPersistent,
    entity,
    valueOrigin,
    columnOrigin,
    valueDestination,
    columnDestination,
    replacementState,
    replacementValue
}: {
    idMergeRequestPersistent: string
    entity: Entity
    valueOrigin: Value
    columnOrigin: Column
    valueDestination?: Value
    columnDestination: Column
    replacementState?: ReplacementState
    replacementValue: string | undefined
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(resolveConflictStart(entity.idPersistent))
        try {
            const rsp = await cosmaeMergeRequestApiPostResolveConflict({
                path: { id_merge_request_persistent: idMergeRequestPersistent },
                body: {
                    id_entity_version: entity.version,
                    id_column_origin_version: columnOrigin.version,
                    id_value_origin_version: valueOrigin.version,
                    id_column_destination_version: columnDestination.version,
                    id_value_destination_version: valueDestination?.version,
                    id_entity_persistent: entity.idPersistent,
                    id_column_origin_persistent: columnOrigin.idPersistent,
                    id_value_origin_persistent: valueOrigin.idPersistent,
                    id_column_destination_persistent: columnDestination.idPersistent,
                    id_value_destination_persistent: valueDestination?.idPersistent,
                    replacement_state: replacementState,
                    replacement_value: replacementValue
                }
            })
            if (!rsp.error) {
                dispatch(
                    resolveConflictSuccess({
                        idEntityPersistent: entity.idPersistent,
                        replacementState: replacementState,
                        replacementValue: replacementValue
                    })
                )
                dispatch(addSuccessVanish('Conflict resolved successfully.'))
            } else {
                dispatch(resolveConflictError(entity.idPersistent))
                if (rsp.error) {
                    dispatch(addError(rsp.error.msg))
                }
            }
        } catch (e: unknown) {
            dispatch(resolveConflictError(entity.idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMergeRequestConflictFromApi(json: any): MergeRequestConflict {
    const valueDestinationJson = json['value_destination']
    const valueDestination =
        valueDestinationJson === null
            ? undefined
            : parseValueFromJson(valueDestinationJson)
    return newMergeRequestConflict({
        entity: parseEntityObjectFromJson(json['entity']),
        valueOrigin: parseValueFromJson(json['value_origin']),
        valueDestination: valueDestination,
        replacementState: replacementStateJsonToAppDict[json['replacement_state']],
        replacementValue: json['replacement_value'] ?? undefined
    })
}

export const replacementStateJsonToAppDict: {
    [key: string]: ReplacementState | undefined
} = {
    KEEP: ReplacementState.KEEP,
    REPLACE: ReplacementState.REPLACE,
    VALUE: ReplacementState.VALUE
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseValueFromJson(json: any) {
    return newValue({
        idPersistent: json['id_persistent'],
        version: json['version'],
        value: json['value']
    })
}

export function startMerge(idMergeRequestPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(startMergeStart())
        try {
            const rsp = await cosmaeMergeRequestApiPostMergeRequestMerge({
                path: { id_merge_request_persistent: idMergeRequestPersistent }
            })
            if (!rsp.error) {
                dispatch(startMergeSuccess())
                dispatch(addSuccessVanish('Application of resolutions started.'))
            } else {
                let msg = rsp.error.msg
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(toggleDisableOnMergeStart())
        try {
            const rsp = await cosmaeMergeRequestApiPatchMergeRequest({
                path: { id_merge_request_persistent: idMergeRequestPersistent },
                body: { disable_origin_on_merge: disableOriginOnMerge }
            })
            if (rsp.data) {
                dispatch(toggleDisableOnMergeSuccess(disableOriginOnMerge))
            } else {
                const msg = rsp.error.msg
                dispatch(addError(msg))
                dispatch(toggleDisableOnMergeError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(toggleDisableOnMergeError())
        }
    }
}
