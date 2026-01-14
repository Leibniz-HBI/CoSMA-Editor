import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    getEntityDetailsError,
    getEntityDetailsStart,
    getEntityDetailsSuccess,
    getEntityError,
    getEntitySearchResultsError,
    getEntitySearchResultsStart,
    getEntitySearchResultsSuccess,
    getEntityStart,
    getEntitySuccess,
    submitEntityJustificationError,
    submitEntityJustificationStart,
    submitEntityJustificationSuccess
} from './slice'
import { config } from '../config'
import { parseEntityObjectFromJson } from '../table/thunks'
import {
    Entity,
    EntityDetails,
    EntitySearchResult,
    newEntity,
    newEntitySearchResult
} from './state'
import { parseValueFromJson } from '../contribution/entity/thunks'
import { parseCommentFromApi } from '../comments/thunks'
import { Comment } from '../comments/slice'
import {
    ColumnResponse,
    cosmaeEntityApiGetDetails,
    cosmaeEntityApiGetValues,
    cosmaeEntityApiPutJustification,
    cosmaeEntityApiSearch,
    EntityWithJustification
} from '../openapi/cosmae'
import { Column } from '../column_menu/state'
import { parseColumnsFromOpenApi } from '../column_menu/thunks'

export function getEntityThunk(
    idEntityPersistentList: string[],
    upUntilTime: Date | undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        const upUntilSinceEpoch = upUntilTime?.getTime()
        dispatch(getEntityStart({ idEntityPersistentList, upUntilSinceEpoch }))
        for (
            let chunkStartIdx = 0;
            chunkStartIdx < idEntityPersistentList.length;
            chunkStartIdx += 1000
        ) {
            const errorList = [],
                idEntityPersistentListSlice = idEntityPersistentList.slice(
                    chunkStartIdx,
                    chunkStartIdx + 1000
                )
            try {
                const rsp = await cosmaeEntityApiGetDetails({
                    body: {
                        id_entity_persistent_list: idEntityPersistentListSlice,
                        up_until_time: upUntilTime?.toISOString()
                    }
                })
                if (rsp.data !== undefined) {
                    for (const idPersistent of idEntityPersistentListSlice) {
                        const entityApi = rsp.data.entity_map[idPersistent]
                        if (entityApi !== undefined) {
                            const entity = parseEntityObjectFromOpenApi(entityApi)
                            dispatch(getEntitySuccess({ entity, upUntilSinceEpoch }))
                        } else {
                            errorList.push(idPersistent)
                        }
                    }
                } else {
                    dispatch(addError(errorMessageFromApi(rsp.error)))
                }
            } catch (e: unknown) {
                dispatch(addError(exceptionMessage(e)))
            }
            if (errorList.length > 0) {
                dispatch(addError(`Could not find ${errorList.length} entities. `))
                dispatch(
                    getEntityError({
                        idEntityPersistentList: errorList,
                        upUntilSinceEpoch
                    })
                )
            }
        }
    }
}

export function getEntityValuesThunk(
    idEntityPersistent: string,
    upUntilTime: Date | undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getEntityDetailsStart())
        try {
            const rsp = await cosmaeEntityApiGetValues({
                query: {
                    id_persistent: idEntityPersistent,
                    up_until_time: upUntilTime?.toISOString()
                }
            })
            if (rsp.data) {
                const details = parseEntityDetailsFromApi(rsp.data)
                dispatch(getEntityDetailsSuccess(details))
            } else {
                dispatch(getEntityDetailsError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(getEntityDetailsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getEntitySearchResultsThunk(searchTerm: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getEntitySearchResultsStart())
        try {
            const rsp = await cosmaeEntityApiSearch({ query: { term: searchTerm } })
            if (rsp.data) {
                const searchResults = rsp.data.search_result_list.map(
                    (result_json: unknown) =>
                        parseEntitySearchResultsFromApi(result_json)
                )
                dispatch(getEntitySearchResultsSuccess(searchResults))
            } else {
                dispatch(getEntitySearchResultsError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(getEntitySearchResultsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function submitEntityJustificationThunk(
    idEntityPersistent: string,
    justification: string
): ThunkWithFetch<{ comment: Comment | undefined; wasAdded: boolean }> {
    return async (dispatch, _getState,_fetch) => {
        dispatch(submitEntityJustificationStart())
        try {
            const rsp = await cosmaeEntityApiPutJustification({
                path: { id_entity_persistent: idEntityPersistent },
                body: { justification_txt: justification }
            })
            if (rsp.data) {
                const comment = parseCommentFromApi(rsp.data.justification)
                dispatch(
                    submitEntityJustificationSuccess({ idEntityPersistent, comment })
                )
                return { comment, wasAdded: true }
            } else if (rsp.response.status == 302) {
                dispatch(addSuccessVanish('A similar justification already exists.'))
                dispatch(submitEntityJustificationSuccess(undefined))
                return { comment: undefined, wasAdded: true }
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(submitEntityJustificationError())
        return { comment: undefined, wasAdded: false }
    }
}

export function parseEntityObjectFromOpenApi(entity: EntityWithJustification): Entity {
    return newEntity({
        idPersistent: entity.id_persistent,
        displayTxt: entity.display_txt,
        displayTxtDetails: parseDisplayTextDetailsFromOpenApi(
            entity.display_txt_details
        ),
        version: entity.version,
        disabled: entity.disabled,
        justificationTxt: entity.justification_txt ?? undefined
    })
}

export function parseDisplayTextDetailsFromOpenApi(
    arg: string | ColumnResponse
): string | Column | undefined {
    if (arg === null) {
        return undefined
    }
    if (typeof arg == 'string') {
        return arg
    }
    return parseColumnsFromOpenApi(arg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntityDetailsFromApi(json: any): EntityDetails {
    const entity = parseEntityObjectFromJson(json['entity'])
    const valueList = json['value_list'].map((instanceJson: unknown) =>
        parseValueFromJson(instanceJson)
    )
    return { entity, valueList: valueList }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntitySearchResultsFromApi(json: any): EntitySearchResult {
    return newEntitySearchResult({
        idEntityPersistent: json['id_entity_persistent'],
        idColumnPersistent: json['id_column_persistent'] ?? undefined,
        matchValue: json['match_value']
    })
}
