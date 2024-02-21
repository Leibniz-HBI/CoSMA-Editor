import { config } from '../../config'
import { parseEntityObjectFromJson } from '../../table/async_actions'
import { parsePublicUserInfoFromJson } from '../../user/thunks'
import { ThunkWithFetch } from '../../util/type'
import {
    EntityMergeRequest,
    EntityMergeRequestStep,
    newEntityMergeRequest
} from './state'
import {
    getEntityMergeRequestStart,
    getEntityMergeRequestsError,
    getEntityMergeRequestsSuccess
} from './slice'
import { addError } from '../../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../../util/exception'

export function getEntityMergeRequests(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getEntityMergeRequestStart())
        try {
            const rsp = await fetch(config.api_path + '/merge_requests/entities/all', {
                credentials: 'include'
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const entityMergeRequests = json['entity_merge_requests'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (mr: any) => parseEntityMergeRequestFromJson(mr)
                )
                dispatch(getEntityMergeRequestsSuccess(entityMergeRequests))
            } else {
                const json = await rsp.json()
                dispatch(addError(errorMessageFromApi(json)))
                dispatch(getEntityMergeRequestsError())
            }
        } catch (exc: unknown) {
            dispatch(addError(exceptionMessage(exc)))
            dispatch(getEntityMergeRequestsError())
        }
    }
}
export function parseEntityMergeRequestFromJson(json: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}): EntityMergeRequest {
    return newEntityMergeRequest({
        idPersistent: json['id_persistent'],
        entityOrigin: parseEntityObjectFromJson(json['origin']),
        entityDestination: parseEntityObjectFromJson(json['destination']),
        createdBy: parsePublicUserInfoFromJson(json['created_by']),
        state: entityMergeRequestStateJsonToEnumMap[json['state']]
    })
}
export const entityMergeRequestStateJsonToEnumMap: {
    [key: string]: EntityMergeRequestStep
} = {
    OPEN: EntityMergeRequestStep.OPEN,
    MERGED: EntityMergeRequestStep.MERGED,
    ERROR: EntityMergeRequestStep.ERROR,
    CLOSED: EntityMergeRequestStep.CLOSED
}
