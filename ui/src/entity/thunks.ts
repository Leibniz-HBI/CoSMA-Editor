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
import { EntityDetails, EntitySearchResult, newEntitySearchResult } from './state'
import { parseValueFromJson } from '../contribution/entity/thunks'
import { parseCommentFromApi } from '../comments/thunks'
import { Comment } from '../comments/slice'

export function getEntityThunk(
    idEntityPersistent: string,
    upUntilTime: Date | undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        const upUntilSinceEpoch = upUntilTime?.getTime()
        dispatch(getEntityStart({ idEntityPersistent, upUntilSinceEpoch }))
        try {
            const params: { [key: string]: string } = {
                id_persistent: idEntityPersistent
            }
            if (upUntilTime !== undefined) {
                params['up_until_time'] = upUntilTime.toISOString()
            }
            const queryPath = '/entities?' + new URLSearchParams(params)
            const rsp = await fetch(config.api_path + queryPath, {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const entity = parseEntityObjectFromJson(json)
                dispatch(getEntitySuccess({ entity, upUntilSinceEpoch }))
            } else {
                dispatch(getEntityError(idEntityPersistent))
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(getEntityError(idEntityPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getEntityValuesThunk(
    idEntityPersistent: string,
    upUntilTime: Date | undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getEntityDetailsStart())
        try {
            const params: { [key: string]: string } = {
                id_persistent: idEntityPersistent
            }
            if (upUntilTime !== undefined) {
                params['up_until_time'] = upUntilTime.toISOString()
            }

            const queryPath = '/entities/values?' + new URLSearchParams(params)
            const rsp = await fetch(config.api_path + queryPath, {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const details = parseEntityDetailsFromApi(json)
                dispatch(getEntityDetailsSuccess(details))
            } else {
                dispatch(getEntityDetailsError())
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(getEntityDetailsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getEntitySearchResultsThunk(searchTerm: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getEntitySearchResultsStart())
        try {
            const rsp = await fetch(
                config.api_path + `/entities/search?term=${searchTerm}`,
                { credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const searchResults = json['search_result_list'].map(
                    (result_json: unknown) =>
                        parseEntitySearchResultsFromApi(result_json)
                )
                dispatch(getEntitySearchResultsSuccess(searchResults))
            } else {
                dispatch(getEntitySearchResultsError())
                dispatch(addError(errorMessageFromApi(json)))
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
    return async (dispatch, _getState, fetch) => {
        dispatch(submitEntityJustificationStart())
        try {
            const rsp = await fetch(
                config.api_path + `/entities/${idEntityPersistent}/justifications`,
                {
                    credentials: 'include',
                    method: 'PUT',
                    body: JSON.stringify({ justification_txt: justification })
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const comment = parseCommentFromApi(json['justification'])
                dispatch(
                    submitEntityJustificationSuccess({ idEntityPersistent, comment })
                )
                return { comment, wasAdded: true }
            } else if (rsp.status == 302) {
                dispatch(addSuccessVanish('A similar justification already exists.'))
                dispatch(submitEntityJustificationSuccess(undefined))
                return { comment: undefined, wasAdded: true }
            } else {
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(submitEntityJustificationError())
        return { comment: undefined, wasAdded: false }
    }
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
