import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    getEntityDetailsError,
    getEntityDetailsStart,
    getEntityDetailsSuccess
} from './slice'
import { config } from '../config'
import { parseEntityObjectFromJson } from '../table/thunks'
import { EntityDetails } from './state'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntityDetailsFromApi(json: any): EntityDetails {
    const entity = parseEntityObjectFromJson(json['entity'])
    const tagInstanceList = json['tag_instance_list'].map((instanceJson: unknown) =>
        parseTagInstanceFromJson(instanceJson)
    )
    return { entity, tagInstanceList }
}
