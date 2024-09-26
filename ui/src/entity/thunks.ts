import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    getEntityDetailsError,
    getEntityDetailsStart,
    getEntityDetailsSuccess,
    getEntitySearchResultsError,
    getEntitySearchResultsStart,
    getEntitySearchResultsSuccess
} from './slice'
import { config } from '../config'
import { parseEntityObjectFromJson } from '../table/thunks'
import { EntityDetails, EntitySearchResult, newEntitySearchResult } from './state'
import { parseTagInstanceFromJson } from '../contribution/entity/thunks'

export function getEntityDetailsThunk(
    idEntityPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getEntityDetailsStart())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/persons/details?id_persistent=${idEntityPersistent}`,
                { credentials: 'include' }
            )
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
                config.api_path + `/persons/search?term=${searchTerm}`,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntityDetailsFromApi(json: any): EntityDetails {
    const entity = parseEntityObjectFromJson(json['entity'])
    const tagInstanceList = json['tag_instance_list'].map((instanceJson: unknown) =>
        parseTagInstanceFromJson(instanceJson)
    )
    return { entity, tagInstanceList }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntitySearchResultsFromApi(json: any): EntitySearchResult {
    return newEntitySearchResult({
        idEntityPersistent: json['id_entity_persistent'],
        idTagDefinitionPersistent: json['id_tag_definition_persistent'] ?? undefined,
        matchValue: json['match_value']
    })
}
