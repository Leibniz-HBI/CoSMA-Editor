import { parseEntityObjectFromJson } from '../../table/thunks'
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
import {
    cosmaeMergeRequestEntityApiGetMergeRequests,
    EntityMergeRequest as EntityMergeRequestApi
} from '../../openapi/cosmae'

export function getEntityMergeRequests(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getEntityMergeRequestStart())
        try {
            const rsp = await cosmaeMergeRequestEntityApiGetMergeRequests()
            if (rsp.data) {
                const entityMergeRequests = rsp.data.entity_merge_requests.map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (mr: any) => parseEntityMergeRequestFromJson(mr)
                )
                dispatch(getEntityMergeRequestsSuccess(entityMergeRequests))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(getEntityMergeRequestsError())
            }
        } catch (exc: unknown) {
            dispatch(addError(exceptionMessage(exc)))
            dispatch(getEntityMergeRequestsError())
        }
    }
}
export function parseEntityMergeRequestFromJson(
    mergeRequest: EntityMergeRequestApi
): EntityMergeRequest {
    return newEntityMergeRequest({
        idPersistent: mergeRequest.id_persistent,
        entityOrigin: parseEntityObjectFromJson(mergeRequest.origin),
        entityDestination: parseEntityObjectFromJson(mergeRequest.destination),
        createdBy: parsePublicUserInfoFromJson(mergeRequest.created_by),
        state: entityMergeRequestStateJsonToEnumMap[mergeRequest.state]
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
